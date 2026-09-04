// ============================================================================
// DungeonTrouble Simulation Engine
// Complete migration of DungeonEngine/Simulation (C++17) to TypeScript
// ============================================================================

import { SimRandom } from './simRandom';

export interface SimContext {
  tickNumber: number;
  fixedDelta: number;
  randomSeed: number;
}

export class SimulationClock {
  private tickRateHz: number;
  private fixedDelta: number;
  private maxTicksPerAdvance: number;
  private accumulator = 0;
  private tickNumber = 0;

  constructor(tickRateHz = 30.0, maxTicksPerAdvance = 5) {
    this.tickRateHz = tickRateHz;
    this.fixedDelta = 1.0 / tickRateHz;
    this.maxTicksPerAdvance = maxTicksPerAdvance;
  }

  Advance(dt: number): number {
    this.accumulator += dt;

    let ticks = 0;
    while (this.accumulator >= this.fixedDelta && ticks < this.maxTicksPerAdvance) {
      this.accumulator -= this.fixedDelta;
      ticks++;
    }

    if (this.accumulator >= this.fixedDelta) {
      // Hit cap, drop remainder to prevent spiral of death
      this.accumulator = 0.0;
    }

    return ticks;
  }

  IncrementTick(): void {
    this.tickNumber++;
  }

  GetTickNumber(): number {
    return this.tickNumber;
  }

  GetFixedDelta(): number {
    return this.fixedDelta;
  }

  GetInterpolationAlpha(): number {
    return this.accumulator / this.fixedDelta;
  }
}

export interface ISimSystem {
  Tick(context: SimContext): void;
  GetName(): string;
}

interface SystemEntry {
  system: ISimSystem;
  phase: number;
  registrationOrder: number;
}

export class SystemScheduler {
  private systems: SystemEntry[] = [];
  private nextRegistrationOrder = 0;
  private needsSort = false;

  AddSystem(system: ISimSystem, phase: number): void {
    this.systems.push({
      system,
      phase,
      registrationOrder: this.nextRegistrationOrder++,
    });
    this.needsSort = true;
  }

  TickAll(context: SimContext): void {
    if (this.needsSort) {
      this.systems.sort((a, b) => {
        if (a.phase !== b.phase) {
          return a.phase - b.phase;
        }
        return a.registrationOrder - b.registrationOrder;
      });
      this.needsSort = false;
    }

    for (const entry of this.systems) {
      entry.system.Tick(context);
    }
  }

  GetSystems(): readonly ISimSystem[] {
    return this.systems.map(s => s.system);
  }
}

export class SimulationLoop {
  private clock: SimulationClock;
  private scheduler: SystemScheduler;
  private baseSeed: number;

  constructor(baseSeed = 0, tickRateHz = 30.0, maxTicksPerAdvance = 5) {
    this.clock = new SimulationClock(tickRateHz, maxTicksPerAdvance);
    this.scheduler = new SystemScheduler();
    this.baseSeed = baseSeed;
  }

  Update(realDt: number): void {
    const ticksToRun = this.clock.Advance(realDt);

    for (let i = 0; i < ticksToRun; i++) {
      this.clock.IncrementTick();

      // Deterministic per-tick random seed derivation
      // Uses 32-bit hash combination of base seed and tick number
      const tick = this.clock.GetTickNumber();
      const combined = (this.baseSeed ^ (Math.imul(tick, 0x9e3779b9))) >>> 0;

      const context: SimContext = {
        tickNumber: tick,
        fixedDelta: this.clock.GetFixedDelta(),
        randomSeed: combined,
      };

      this.scheduler.TickAll(context);
    }
  }

  GetScheduler(): SystemScheduler {
    return this.scheduler;
  }

  GetClock(): SimulationClock {
    return this.clock;
  }
}

export { SimRandom };
