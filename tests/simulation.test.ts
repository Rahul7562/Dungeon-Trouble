import { describe, it, expect } from 'vitest';
import {
  SimulationClock,
  SimulationLoop,
  SystemScheduler,
  ISimSystem,
  SimContext,
  SimRandom,
} from '../src/engine/simulation';

class MockSimSystem implements ISimSystem {
  private name: string;
  private log: string[];
  public lastContext?: SimContext;

  constructor(name: string, log: string[]) {
    this.name = name;
    this.log = log;
  }

  Tick(context: SimContext): void {
    this.log.push(this.name);
    this.lastContext = { ...context };
  }

  GetName(): string {
    return this.name;
  }
}

describe('Simulation Framework Tests', () => {
  it('SimulationClock Tick Generation and Cap', () => {
    // 30 Hz tick rate, cap 5
    const clock = new SimulationClock(30.0, 5);

    // 1.0 seconds at 30Hz cap is 5
    const ticks = clock.Advance(1.0);
    expect(ticks).toBe(5); // Hits cap

    // Advance 1/30 seconds should yield 1 tick
    const tick1 = clock.Advance(1.0 / 30.0);
    expect(tick1).toBe(1);

    // Tick monotonicity
    expect(clock.GetTickNumber()).toBe(0);
    clock.IncrementTick();
    expect(clock.GetTickNumber()).toBe(1);
  });

  it('SystemScheduler Ordering', () => {
    const scheduler = new SystemScheduler();
    const log: string[] = [];

    scheduler.AddSystem(new MockSimSystem('Phase2_B', log), 2);
    scheduler.AddSystem(new MockSimSystem('Phase1_A', log), 1);
    scheduler.AddSystem(new MockSimSystem('Phase2_A', log), 2);

    const ctx: SimContext = { tickNumber: 1, fixedDelta: 1 / 30, randomSeed: 12345 };
    scheduler.TickAll(ctx);

    expect(log.length).toBe(3);
    expect(log[0]).toBe('Phase1_A'); // Lowest phase first
    expect(log[1]).toBe('Phase2_B'); // Phase 2, added first
    expect(log[2]).toBe('Phase2_A'); // Phase 2, added second
  });

  it('SimulationLoop Execution & Determinism', () => {
    const log1: string[] = [];
    const log2: string[] = [];

    const loop1 = new SimulationLoop(12345, 30.0, 5);
    const loop2 = new SimulationLoop(12345, 30.0, 5);

    const sys1 = new MockSimSystem('SysA', log1);
    const sys2 = new MockSimSystem('SysA', log2);

    loop1.GetScheduler().AddSystem(sys1, 1);
    loop2.GetScheduler().AddSystem(sys2, 1);

    loop1.Update(0.1); // 3 ticks (0.1 / (1/30) = 3)
    loop2.Update(0.1);

    expect(log1.length).toBe(3);
    expect(log2.length).toBe(3);
    expect(loop1.GetClock().GetTickNumber()).toBe(3);
    expect(loop2.GetClock().GetTickNumber()).toBe(3);

    expect(sys1.lastContext?.randomSeed).toBe(sys2.lastContext?.randomSeed);
  });

  it('SimRandom Reproducibility', () => {
    const rand1 = new SimRandom(42);
    const rand2 = new SimRandom(42);
    const rand3 = new SimRandom(1337);

    expect(rand1.NextUInt32()).toBe(rand2.NextUInt32());
    expect(rand1.NextFloat01()).toBe(rand2.NextFloat01());
    expect(rand1.NextRange(1, 100)).toBe(rand2.NextRange(1, 100));

    const rand1Reset = new SimRandom(42);
    expect(rand1Reset.NextUInt32()).not.toBe(rand3.NextUInt32());
  });
});
