import { describe, it, expect } from 'vitest';
import { Registry, CommandBuffer } from '../src/engine/ecs';

describe('ECS Framework Tests', () => {
  it('Entity Lifecycle and Generation Recycling', () => {
    const registry = new Registry();

    const e1 = registry.Create();
    expect(e1.GetIndex()).toBe(0);
    expect(e1.GetGeneration()).toBe(1);
    expect(registry.IsAlive(e1)).toBe(true);

    const e2 = registry.Create();
    expect(e2.GetIndex()).toBe(1);
    expect(e2.GetGeneration()).toBe(1);
    expect(registry.IsAlive(e2)).toBe(true);

    registry.Destroy(e1);
    expect(registry.IsAlive(e1)).toBe(false); // Stale handle not alive

    const e3 = registry.Create();
    expect(e3.GetIndex()).toBe(0); // Recycled index
    expect(e3.GetGeneration()).toBe(2); // Generation bumped
    expect(registry.IsAlive(e3)).toBe(true);
    expect(registry.IsAlive(e1)).toBe(false); // e1 should STILL be dead
  });

  it('Component Add/Get/Remove/Has', () => {
    const registry = new Registry();
    const e1 = registry.Create();
    const e2 = registry.Create();

    expect(registry.HasComponent(e1, 'Position')).toBe(false);

    registry.AddComponent(e1, 'Position', { x: 10.0, y: 20.0 });
    expect(registry.HasComponent(e1, 'Position')).toBe(true);
    expect(registry.HasComponent(e2, 'Position')).toBe(false);

    const pos = registry.GetComponent<{ x: number; y: number }>(e1, 'Position');
    expect(pos).toBeDefined();
    expect(pos?.x).toBe(10.0);
    expect(pos?.y).toBe(20.0);

    registry.RemoveComponent(e1, 'Position');
    expect(registry.HasComponent(e1, 'Position')).toBe(false);
    expect(registry.GetComponent(e1, 'Position')).toBeUndefined();
  });

  it('View Iteration', () => {
    const registry = new Registry();

    const e1 = registry.Create();
    const e2 = registry.Create();
    const e3 = registry.Create();

    registry.AddComponent(e1, 'Position', { x: 1.0, y: 1.0 });
    registry.AddComponent(e1, 'Velocity', { dx: 0.1, dy: 0.1 });

    registry.AddComponent(e2, 'Position', { x: 2.0, y: 2.0 }); // Missing Velocity

    registry.AddComponent(e3, 'Position', { x: 3.0, y: 3.0 });
    registry.AddComponent(e3, 'Velocity', { dx: 0.3, dy: 0.3 });

    let count = 0;
    registry.GetView('Position', 'Velocity').Each((_entity, p, v) => {
      count++;
      expect(Math.abs(p.x - v.dx * 10.0)).toBeLessThan(0.001);
    });

    expect(count).toBe(2);
  });

  it('CommandBuffer Defers Operations', () => {
    const registry = new Registry();
    const cmd = new CommandBuffer();

    const e1 = registry.Create();
    const e2 = registry.Create();

    registry.AddComponent(e1, 'Position', { x: 0.0, y: 0.0 });

    // Defer adding velocity
    cmd.AddComponent(e1, 'Velocity', { dx: 1.0, dy: 1.0 });
    // Defer destroying e2
    cmd.DestroyEntity(e2);
    // Defer removing position from e1
    cmd.RemoveComponent(e1, 'Position');

    // State before flush
    expect(registry.HasComponent(e1, 'Velocity')).toBe(false);
    expect(registry.HasComponent(e1, 'Position')).toBe(true);
    expect(registry.IsAlive(e2)).toBe(true);

    cmd.Flush(registry);

    // State after flush
    expect(registry.HasComponent(e1, 'Velocity')).toBe(true);
    expect(registry.HasComponent(e1, 'Position')).toBe(false);
    expect(registry.IsAlive(e2)).toBe(false);
  });

  it('Entity and Component scale', () => {
    const registry = new Registry();

    for (let i = 0; i < 1000; i++) {
      const e = registry.Create();
      registry.AddComponent(e, 'Position', { x: i, y: 0 });
      if (i % 2 === 0) {
        registry.AddComponent(e, 'Velocity', { dx: 1.0, dy: 1.0 });
      }
    }

    let iterated = 0;
    registry.GetView('Position', 'Velocity').Each((_e, p, v) => {
      p.x += v.dx;
      iterated++;
    });

    expect(iterated).toBe(500);
  });
});
