import { describe, it, expect } from 'vitest';
import {
  DamageSchool,
  DamageEvent,
  DamageAppliedEvent,
  EntityDiedEvent,
  HitShapeKind,
  HitShape,
  StatSheet,
  StatType,
  ModifierOp,
} from '../src/engine/types';
import {
  DamagePipeline,
  DAMAGE_FLAGS,
  CombatSystem,
  HitQuery,
} from '../src/engine/combat';
import { StatCalculator, createStatSheet } from '../src/engine/stats';
import { SimRandom } from '../src/engine/simRandom';
import { MockRegistry, MockEventBus, nearlyEqual } from './ecsHelper';

describe('Gameplay - Combat Tests', () => {
  it('DamagePipeline calculations', () => {
    const sourceStats: StatSheet = createStatSheet();
    const targetStats: StatSheet = createStatSheet();
    const rng = new SimRandom(12345);

    // Set up source stats
    StatCalculator.AddModifier(sourceStats, { sourceId: 1, stat: StatType.AttackPower, op: ModifierOp.Flat, value: 100.0, durationTicks: -1 });
    StatCalculator.AddModifier(sourceStats, { sourceId: 2, stat: StatType.SpellPower, op: ModifierOp.Flat, value: 200.0, durationTicks: -1 });
    StatCalculator.AddModifier(sourceStats, { sourceId: 3, stat: StatType.CritChance, op: ModifierOp.Flat, value: 50.0, durationTicks: -1 });
    StatCalculator.AddModifier(sourceStats, { sourceId: 4, stat: StatType.CritMultiplier, op: ModifierOp.Flat, value: 200.0, durationTicks: -1 }); // 200 multiplier, 2x

    // Set up target stats
    StatCalculator.AddModifier(targetStats, { sourceId: 1, stat: StatType.Armor, op: ModifierOp.Flat, value: 100.0, durationTicks: -1 }); // 100 / (100 + 100) = 50% reduction

    // 1. Physical without crit or armor bypass
    {
      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: 50.0,
        school: DamageSchool.Physical,
        flags: 0,
      };
      // Base 50 + AP(100)*0.5 = 100.
      // Armor reduction: 50%. Final = 50.
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(nearlyEqual(res.amount, 50.0)).toBe(true);
      expect(res.crit).toBe(false);
    }

    // 2. Magic passes through armor
    {
      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: 50.0,
        school: DamageSchool.Fire,
        flags: 0,
      };
      // Base 50 + SP(200)*0.5 = 150.
      // No armor reduction for magic.
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(nearlyEqual(res.amount, 150.0)).toBe(true);
    }

    // 3. Physical IgnoreArmor bypasses armor
    {
      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: 50.0,
        school: DamageSchool.Physical,
        flags: DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
      };
      // Base 50 + AP(100)*0.5 = 100.
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(nearlyEqual(res.amount, 100.0)).toBe(true);
    }

    // 4. TrueDamage bypasses mitigation
    {
      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: 50.0,
        school: DamageSchool.Physical,
        flags: DAMAGE_FLAGS.FLAG_TRUE_DAMAGE,
      };
      // Base 50 + AP(100)*0.5 = 100.
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(nearlyEqual(res.amount, 100.0)).toBe(true);
    }

    // 5. Clamp at 0
    {
      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: -500.0, // negative base damage
        school: DamageSchool.Physical,
        flags: 0,
      };
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(nearlyEqual(res.amount, 0.0)).toBe(true);
    }

    // 6. Crit forcing via seed selection
    {
      StatCalculator.AddModifier(sourceStats, { sourceId: 5, stat: StatType.CritChance, op: ModifierOp.Flat, value: 100.0, durationTicks: -1 }); // 150% chance

      const e: DamageEvent = {
        source: 1,
        target: 2,
        baseAmount: 50.0,
        school: DamageSchool.Physical,
        flags: DAMAGE_FLAGS.FLAG_CAN_CRIT | DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
      };
      // Base: 50 + AP(100)*0.5 = 100
      // Crit (3.5x, base 150 + 200 = 350): 350
      const res = DamagePipeline.Resolve(e, sourceStats, targetStats, rng);
      expect(res.crit).toBe(true);
      expect(nearlyEqual(res.amount, 350.0)).toBe(true);
    }
  });

  it('CombatSystem handles DamageEvents, Determinism, and Death', () => {
    const reg = new MockRegistry();
    const bus = new MockEventBus();

    const s1 = reg.Create();
    reg.AddComponent<StatSheet>(s1, 'StatSheet', createStatSheet());

    const t1 = reg.Create();
    reg.AddComponent<StatSheet>(t1, 'StatSheet', createStatSheet());
    reg.AddComponent(t1, 'Health', { current: 100.0, max: 100.0 });

    const sys = new CombatSystem(reg, bus);

    // Basic Damage Processing
    {
      const e: DamageEvent = {
        source: s1,
        target: t1,
        baseAmount: 30.0,
        school: DamageSchool.Physical,
        flags: DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
      };

      sys.QueueDamage(e);

      const ctx = { tickNumber: 1, dt: 0.033, randomSeed: 42 };
      sys.Tick(ctx);

      const h = reg.GetComponent(t1, 'Health');
      expect(h).toBeDefined();
      expect(nearlyEqual(h.current, 70.0)).toBe(true); // 100 - 30

      let gotDamageEvent = false;
      bus.Subscribe((ev: any) => {
        if (ev.target === t1 && ev.finalAmount !== undefined) gotDamageEvent = true;
      });
      bus.DispatchQueue();
      expect(gotDamageEvent).toBe(true);
    }

    // Death and DeadTag
    {
      const e: DamageEvent = {
        source: s1,
        target: t1,
        baseAmount: 150.0,
        school: DamageSchool.Physical,
        flags: DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
      };

      sys.QueueDamage(e);

      const ctx = { tickNumber: 1, dt: 0.033, randomSeed: 42 };
      sys.Tick(ctx);

      const h = reg.GetComponent(t1, 'Health');
      expect(h).toBeDefined();
      expect(nearlyEqual(h.current, 0.0)).toBe(true);
      expect(reg.HasComponent(t1, 'DeadTag')).toBe(true);

      let deathEvents = 0;
      bus.Subscribe((ev: any) => {
        if (ev.entity === t1) deathEvents++;
      });
      bus.DispatchQueue();
      expect(deathEvents).toBe(1);

      // Second hit should be ignored because of DeadTag
      bus.ClearAllQueues();
      let moreDeathEvents = 0;
      bus.Subscribe((ev: any) => {
        if (ev.entity === t1) moreDeathEvents++;
      });
      sys.QueueDamage(e);
      sys.Tick(ctx);
      bus.DispatchQueue();
      expect(moreDeathEvents).toBe(0); // No second death event
    }

    // Determinism check
    {
      const regA = new MockRegistry();
      const regB = new MockRegistry();
      const busA = new MockEventBus();
      const busB = new MockEventBus();

      const sA = regA.Create(); const sB = regB.Create();
      regA.AddComponent(sA, 'StatSheet', createStatSheet());
      regB.AddComponent(sB, 'StatSheet', createStatSheet());

      const tA = regA.Create(); const tB = regB.Create();
      regA.AddComponent(tA, 'StatSheet', createStatSheet());
      regB.AddComponent(tB, 'StatSheet', createStatSheet());
      regA.AddComponent(tA, 'Health', { current: 100.0, max: 100.0 });
      regB.AddComponent(tB, 'Health', { current: 100.0, max: 100.0 });

      const sysA = new CombatSystem(regA, busA);
      const sysB = new CombatSystem(regB, busB);

      const eA: DamageEvent = { source: sA, target: tA, baseAmount: 40.0, school: DamageSchool.Physical, flags: DAMAGE_FLAGS.FLAG_CAN_CRIT };
      const eB: DamageEvent = { source: sB, target: tB, baseAmount: 40.0, school: DamageSchool.Physical, flags: DAMAGE_FLAGS.FLAG_CAN_CRIT };

      sysA.QueueDamage(eA); sysB.QueueDamage(eB);

      const ctxA = { tickNumber: 1, dt: 0.033, randomSeed: 999 };
      const ctxB = { tickNumber: 1, dt: 0.033, randomSeed: 999 };

      sysA.Tick(ctxA); sysB.Tick(ctxB);

      const hA = regA.GetComponent(tA, 'Health');
      const hB = regB.GetComponent(tB, 'Health');
      expect(hA.current).toBe(hB.current); // EXACT match

      let finalA = 0; let finalB = 0;
      busA.Subscribe((ev: any) => { if (ev.finalAmount !== undefined) finalA = ev.finalAmount; });
      busB.Subscribe((ev: any) => { if (ev.finalAmount !== undefined) finalB = ev.finalAmount; });
      busA.DispatchQueue();
      busB.DispatchQueue();

      expect(finalA).toBe(finalB); // EXACT match
    }
  });

  it('HitQuery overlap and collection', () => {
    // Circle-Circle
    const c1: HitShape = { kind: HitShapeKind.Circle, x: 0, y: 0, radius: 5, halfW: 0, halfH: 0 };
    const c2: HitShape = { kind: HitShapeKind.Circle, x: 8, y: 0, radius: 5, halfW: 0, halfH: 0 };
    const c3: HitShape = { kind: HitShapeKind.Circle, x: 12, y: 0, radius: 5, halfW: 0, halfH: 0 };
    expect(HitQuery.Overlaps(c1, c2)).toBe(true);
    expect(HitQuery.Overlaps(c1, c3)).toBe(false);

    // AABB-AABB
    const b1: HitShape = { kind: HitShapeKind.AABB, x: 0, y: 0, radius: 0, halfW: 5, halfH: 5 };
    const b2: HitShape = { kind: HitShapeKind.AABB, x: 8, y: 0, radius: 0, halfW: 5, halfH: 5 };
    const b3: HitShape = { kind: HitShapeKind.AABB, x: 12, y: 0, radius: 0, halfW: 5, halfH: 5 };
    expect(HitQuery.Overlaps(b1, b2)).toBe(true);
    expect(HitQuery.Overlaps(b1, b3)).toBe(false);

    // Circle-AABB
    const c: HitShape = { kind: HitShapeKind.Circle, x: 0, y: 0, radius: 5, halfW: 0, halfH: 0 };
    const box1: HitShape = { kind: HitShapeKind.AABB, x: 8, y: 0, radius: 0, halfW: 5, halfH: 5 };
    const box2: HitShape = { kind: HitShapeKind.AABB, x: 12, y: 0, radius: 0, halfW: 5, halfH: 5 };
    expect(HitQuery.Overlaps(c, box1)).toBe(true);
    expect(HitQuery.Overlaps(c, box2)).toBe(false);
    expect(HitQuery.Overlaps(box1, c)).toBe(true); // commutative

    // CollectOverlapping excludes TeamId
    const reg = new MockRegistry();
    const e1 = reg.Create();
    reg.AddComponent(e1, 'HitShape', { kind: HitShapeKind.Circle, x: 0.0, y: 0.0, radius: 5.0, halfW: 0.0, halfH: 0.0 });
    reg.AddComponent(e1, 'TeamId', { team: 1 });

    const e2 = reg.Create();
    reg.AddComponent(e2, 'HitShape', { kind: HitShapeKind.Circle, x: 2.0, y: 2.0, radius: 5.0, halfW: 0.0, halfH: 0.0 });
    reg.AddComponent(e2, 'TeamId', { team: 2 }); // Enemy

    const e3 = reg.Create();
    reg.AddComponent(e3, 'HitShape', { kind: HitShapeKind.Circle, x: 20.0, y: 20.0, radius: 5.0, halfW: 0.0, halfH: 0.0 }); // Too far
    reg.AddComponent(e3, 'TeamId', { team: 2 });

    const queryArea: HitShape = { kind: HitShapeKind.Circle, x: 0, y: 0, radius: 10, halfW: 0, halfH: 0 };
    const myTeam = { team: 1 };

    const hits: any[] = [];
    HitQuery.CollectOverlapping(reg, queryArea, myTeam, hits);

    expect(hits.length).toBe(1);
    expect(hits[0]).toBe(e2); // e1 is my team, e3 is too far
  });
});
