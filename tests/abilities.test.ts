import { describe, it, expect } from 'vitest';
import {
  AbilityDef,
  DamageSchool,
  StatusKind,
  StatusEffectDef,
  StatType,
  ModifierOp,
} from '../src/engine/types';
import {
  AbilityDefTable,
  StatusEffectDefTable,
  AbilitySystem,
  StatusEffectSystem,
} from '../src/engine/abilities';
import { CombatSystem, DAMAGE_FLAGS } from '../src/engine/combat';
import { StatCalculator, createStatSheet } from '../src/engine/stats';
import { MockRegistry, MockEventBus, nearlyEqual } from './ecsHelper';

describe('Gameplay - Abilities Tests', () => {
  it('Abilities - Cast Success', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const combatSystem = new CombatSystem(registry, eventBus);
    const abilityTable = new AbilityDefTable();
    const statusTable = new StatusEffectDefTable();
    const abilitySystem = new AbilitySystem(registry, eventBus, combatSystem, abilityTable, statusTable);

    // Register ability
    const fireball: AbilityDef = {
      id: 1,
      name: 'Fireball',
      baseDamage: 50.0,
      school: DamageSchool.Fire,
      damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
      cooldownTicks: 100,
      manaCost: 20.0,
      range: 100.0,
      appliesStatusId: 0,
    };
    abilityTable.Register(fireball);

    const caster = registry.Create();
    registry.AddComponent(caster, 'AbilityBook', { abilityIds: [1], cooldownReadyAtTick: {} });
    registry.AddComponent(caster, 'Mana', { current: 100.0, max: 100.0 });

    // Add CDR stat
    const sheet = createStatSheet();
    StatCalculator.AddModifier(sheet, { sourceId: 100, stat: StatType.CooldownReduction, op: ModifierOp.Flat, value: 20.0, durationTicks: -1 });
    registry.AddComponent(caster, 'StatSheet', sheet);

    const target = registry.Create();
    registry.AddComponent(target, 'Health', { current: 200.0, max: 200.0 });

    // Subscribe to event
    let eventFired = false;
    eventBus.Subscribe((e: any) => {
      if (e.abilityId === 1 && e.caster === caster && e.target === target) {
        eventFired = true;
      }
    });

    const context = { tickNumber: 10 };

    // Cast
    abilitySystem.QueueCast({ caster, abilityId: 1, target });
    abilitySystem.Tick(context);
    eventBus.DispatchQueue();

    const stats = abilitySystem.GetLastTickStats();
    expect(stats.casts).toBe(1);
    expect(stats.rejected).toBe(0);

    // Mana deducted
    expect(nearlyEqual(registry.GetComponent(caster, 'Mana').current, 80.0)).toBe(true);

    // Cooldown set with 20% CDR (100 -> 80 ticks) -> ready at tick 10 + 80 = 90
    const book = registry.GetComponent(caster, 'AbilityBook');
    expect(book.cooldownReadyAtTick[1]).toBe(90);

    // Event emitted
    expect(eventFired).toBe(true);
  });

  it('Abilities - Rejections', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const combatSystem = new CombatSystem(registry, eventBus);
    const abilityTable = new AbilityDefTable();
    const statusTable = new StatusEffectDefTable();
    const abilitySystem = new AbilitySystem(registry, eventBus, combatSystem, abilityTable, statusTable);

    const strike: AbilityDef = {
      id: 1,
      name: 'Strike',
      baseDamage: 10.0,
      school: DamageSchool.Physical,
      damageFlags: 0,
      cooldownTicks: 50,
      manaCost: 10.0,
      range: 50.0,
      appliesStatusId: 0,
    };
    abilityTable.Register(strike);

    const caster = registry.Create();
    registry.AddComponent(caster, 'AbilityBook', { abilityIds: [1], cooldownReadyAtTick: {} });
    registry.AddComponent(caster, 'Mana', { current: 5.0, max: 100.0 }); // not enough mana

    const target = registry.Create();
    const context = { tickNumber: 100 };

    // 1. Unknown ability
    abilitySystem.QueueCast({ caster, abilityId: 999, target });
    abilitySystem.Tick(context);
    expect(abilitySystem.GetLastTickStats().rejected).toBe(1);

    // 2. Insufficient mana
    abilitySystem.QueueCast({ caster, abilityId: 1, target });
    abilitySystem.Tick(context);
    expect(abilitySystem.GetLastTickStats().rejected).toBe(1);

    // Give mana, but on cooldown
    registry.GetComponent(caster, 'Mana').current = 100.0;
    registry.GetComponent(caster, 'AbilityBook').cooldownReadyAtTick[1] = 150;
    abilitySystem.QueueCast({ caster, abilityId: 1, target });
    abilitySystem.Tick(context);
    expect(abilitySystem.GetLastTickStats().rejected).toBe(1);

    // Clear cooldown, but stunned
    registry.GetComponent(caster, 'AbilityBook').cooldownReadyAtTick[1] = 0;
    registry.AddComponent(caster, 'StunnedTag', {});
    abilitySystem.QueueCast({ caster, abilityId: 1, target });
    abilitySystem.Tick(context);
    expect(abilitySystem.GetLastTickStats().rejected).toBe(1);
  });

  it('Status Effects - DoT Timing and Damage', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const combatSystem = new CombatSystem(registry, eventBus);
    const statusTable = new StatusEffectDefTable();
    const statusSystem = new StatusEffectSystem(registry, combatSystem, statusTable);

    const dotDef: StatusEffectDef = {
      id: 1,
      name: 'Poison',
      kind: StatusKind.DamageOverTime,
      magnitudePerTick: 5.0,
      school: DamageSchool.Physical,
      durationTicks: 30, // 3 ticks
      tickInterval: 10,
    };
    statusTable.Register(dotDef);

    const target = registry.Create();
    registry.AddComponent(target, 'Health', { current: 100.0, max: 100.0 });
    registry.AddComponent(target, 'StatSheet', createStatSheet());

    const source = registry.Create();
    registry.AddComponent(source, 'StatSheet', createStatSheet());

    registry.AddComponent(target, 'ActiveStatusEffects', {
      effects: [{ defId: 1, source, remainingTicks: 30, nextTickIn: 10 }],
    });

    const context = { tickNumber: 1 };

    for (let i = 0; i < 35; i++) {
      statusSystem.Tick(context);
      combatSystem.Tick(context);
    }

    // Poison should have ticked 3 times: 15 damage -> 85 health remaining
    expect(nearlyEqual(registry.GetComponent(target, 'Health').current, 85.0)).toBe(true);

    // Status should be removed
    expect(registry.GetComponent(target, 'ActiveStatusEffects').effects.length).toBe(0);
  });

  it('Status Effects - Stun Tag Lifecycle', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const combatSystem = new CombatSystem(registry, eventBus);
    const abilityTable = new AbilityDefTable();
    const statusTable = new StatusEffectDefTable();
    const abilitySystem = new AbilitySystem(registry, eventBus, combatSystem, abilityTable, statusTable);
    const statusSystem = new StatusEffectSystem(registry, combatSystem, statusTable);

    const stunDef: StatusEffectDef = {
      id: 10,
      name: 'Bash Stun',
      kind: StatusKind.Stun,
      durationTicks: 5,
      tickInterval: 1,
    };
    statusTable.Register(stunDef);

    const bash: AbilityDef = {
      id: 20,
      name: 'Bash',
      baseDamage: 0.0,
      manaCost: 0.0,
      school: DamageSchool.Physical,
      damageFlags: 0,
      cooldownTicks: 0,
      range: 100.0,
      appliesStatusId: 10,
    };
    abilityTable.Register(bash);

    const caster = registry.Create();
    registry.AddComponent(caster, 'AbilityBook', { abilityIds: [20], cooldownReadyAtTick: {} });

    const target = registry.Create();
    const context = { tickNumber: 1 };

    abilitySystem.QueueCast({ caster, abilityId: 20, target });
    abilitySystem.Tick(context);

    expect(registry.HasComponent(target, 'StunnedTag')).toBe(true);

    for (let i = 0; i < 5; i++) {
      statusSystem.Tick(context);
    }

    expect(registry.HasComponent(target, 'StunnedTag')).toBe(false);
  });

  it('Status Effects - StatBuff Apply and Revert', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const combatSystem = new CombatSystem(registry, eventBus);
    const abilityTable = new AbilityDefTable();
    const statusTable = new StatusEffectDefTable();
    const abilitySystem = new AbilitySystem(registry, eventBus, combatSystem, abilityTable, statusTable);
    const statusSystem = new StatusEffectSystem(registry, combatSystem, statusTable);

    const buffDef: StatusEffectDef = {
      id: 50,
      name: 'Empower',
      kind: StatusKind.StatBuff,
      durationTicks: 10,
      tickInterval: 1,
      statModifier: { sourceId: 0, stat: StatType.AttackPower, op: ModifierOp.Flat, value: 50.0, durationTicks: 10 },
    };
    statusTable.Register(buffDef);

    const empower: AbilityDef = {
      id: 60,
      name: 'Empower Spell',
      baseDamage: 0.0,
      manaCost: 0.0,
      school: DamageSchool.Physical,
      damageFlags: 0,
      cooldownTicks: 0,
      range: 100.0,
      appliesStatusId: 50,
    };
    abilityTable.Register(empower);

    const caster = registry.Create();
    registry.AddComponent(caster, 'AbilityBook', { abilityIds: [60], cooldownReadyAtTick: {} });

    const target = registry.Create();
    registry.AddComponent(target, 'StatSheet', createStatSheet());

    const context = { tickNumber: 1 };

    abilitySystem.QueueCast({ caster, abilityId: 60, target });
    abilitySystem.Tick(context);

    const sheet = registry.GetComponent(target, 'StatSheet');
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.AttackPower), 50.0)).toBe(true);

    for (let i = 0; i < 10; i++) {
      statusSystem.Tick(context);
    }

    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.AttackPower), 0.0)).toBe(true);
  });

  it('Abilities - Determinism', () => {
    const runSim = (seed: number): number[] => {
      const registry = new MockRegistry();
      const eventBus = new MockEventBus();
      const combatSystem = new CombatSystem(registry, eventBus);
      const abilityTable = new AbilityDefTable();
      const statusTable = new StatusEffectDefTable();
      const abilitySystem = new AbilitySystem(registry, eventBus, combatSystem, abilityTable, statusTable);
      const statusSystem = new StatusEffectSystem(registry, combatSystem, statusTable);

      const fire: AbilityDef = {
        id: 1,
        name: 'Fire',
        baseDamage: 20.0,
        school: DamageSchool.Fire,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT, // Causes RNG dependency
        cooldownTicks: 0,
        manaCost: 0.0,
        range: 100.0,
        appliesStatusId: 0,
      };
      abilityTable.Register(fire);

      const caster = registry.Create();
      registry.AddComponent(caster, 'AbilityBook', { abilityIds: [1], cooldownReadyAtTick: {} });

      const casterStats = createStatSheet();
      StatCalculator.AddModifier(casterStats, { sourceId: 100, stat: StatType.CritChance, op: ModifierOp.Flat, value: 50.0, durationTicks: -1 });
      StatCalculator.AddModifier(casterStats, { sourceId: 101, stat: StatType.CritMultiplier, op: ModifierOp.Flat, value: 2.0, durationTicks: -1 });
      registry.AddComponent(caster, 'StatSheet', casterStats);

      const targets: number[] = [];
      for (let i = 0; i < 10; ++i) {
        const target = registry.Create();
        registry.AddComponent(target, 'Health', { current: 1000.0, max: 1000.0 });
        registry.AddComponent(target, 'StatSheet', createStatSheet());
        targets.push(target);
      }

      const context = { tickNumber: 0, randomSeed: seed };

      for (let tick = 0; tick < 10; ++tick) {
        context.tickNumber = tick;
        for (const t of targets) {
          abilitySystem.QueueCast({ caster, abilityId: 1, target: t });
        }
        abilitySystem.Tick(context);
        combatSystem.Tick(context);
        statusSystem.Tick(context);
        eventBus.DispatchQueue();
      }

      return targets.map(t => registry.GetComponent(t, 'Health').current);
    };

    const run1 = runSim(12345);
    const run2 = runSim(12345);
    const run3 = runSim(99999);

    expect(run1).toEqual(run2); // Should be exactly identical
    expect(run1).not.toEqual(run3); // Different seed should have different crits
  });
});
