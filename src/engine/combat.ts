import {
  DamageSchool,
  DamageEvent,
  DamageAppliedEvent,
  EntityDiedEvent,
  HitShape,
  HitShapeKind,
  StatSheet,
  StatType,
} from './types';
import { StatCalculator } from './stats';
import { SimRandom } from './simRandom';

export const DAMAGE_FLAGS = {
  FLAG_CAN_CRIT: 1 << 0,
  FLAG_IGNORE_ARMOR: 1 << 1,
  FLAG_TRUE_DAMAGE: 1 << 2,
};

export interface ResolvedDamage {
  amount: number;
  crit: boolean;
}

export class DamagePipeline {
  static Resolve(
    event: DamageEvent,
    sourceStats: StatSheet,
    targetStats: StatSheet,
    rng: SimRandom
  ): ResolvedDamage {
    let damage = event.baseAmount;

    // Stat scaling
    if (event.school === DamageSchool.Physical) {
      damage += 0.5 * StatCalculator.GetStat(sourceStats, StatType.AttackPower);
    } else {
      damage += 0.5 * StatCalculator.GetStat(sourceStats, StatType.SpellPower);
    }

    // Crit check
    let isCrit = false;
    if ((event.flags & DAMAGE_FLAGS.FLAG_CAN_CRIT) !== 0) {
      const critChance = StatCalculator.GetStat(sourceStats, StatType.CritChance);
      if (rng.nextFloat01() * 100.0 < critChance) {
        isCrit = true;
        const critMult = StatCalculator.GetStat(sourceStats, StatType.CritMultiplier);
        damage *= (critMult / 100.0);
      }
    }

    // Armor mitigation
    if ((event.flags & DAMAGE_FLAGS.FLAG_TRUE_DAMAGE) === 0) {
      if ((event.flags & DAMAGE_FLAGS.FLAG_IGNORE_ARMOR) === 0 && event.school === DamageSchool.Physical) {
        const armor = StatCalculator.GetStat(targetStats, StatType.Armor);
        const mitigation = armor / (armor + 100.0);
        damage *= (1.0 - mitigation);
      }
    }

    if (damage < 0.0) {
      damage = 0.0;
    }

    return { amount: damage, crit: isCrit };
  }

  static resolve = DamagePipeline.Resolve;
}

export class HitQuery {
  static Overlaps(a: HitShape, b: HitShape): boolean {
    if (a.kind === HitShapeKind.Circle && b.kind === HitShapeKind.Circle) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const r = a.radius + b.radius;
      return dx * dx + dy * dy <= r * r;
    }

    if (a.kind === HitShapeKind.AABB && b.kind === HitShapeKind.AABB) {
      return (
        Math.abs(a.x - b.x) <= a.halfW + b.halfW &&
        Math.abs(a.y - b.y) <= a.halfH + b.halfH
      );
    }

    // Circle vs AABB
    const circle = a.kind === HitShapeKind.Circle ? a : b;
    const box = a.kind === HitShapeKind.AABB ? a : b;

    const clampedX = Math.max(box.x - box.halfW, Math.min(circle.x, box.x + box.halfW));
    const clampedY = Math.max(box.y - box.halfH, Math.min(circle.y, box.y + box.halfH));

    const dx = circle.x - clampedX;
    const dy = circle.y - clampedY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  static overlaps = HitQuery.Overlaps;

  static CollectOverlapping(
    registry: any,
    area: HitShape,
    excludeTeam: { team: number } | number,
    out?: any[]
  ): any[] {
    const hits: any[] = out || [];
    const teamNum = typeof excludeTeam === 'number' ? excludeTeam : excludeTeam.team;

    // Supports both array of entities and simple Registry query
    if (typeof registry.getAllWithComponents === 'function') {
      const entities = registry.getAllWithComponents(['HitShape']);
      for (const e of entities) {
        const shape = registry.GetComponent?.(e, 'HitShape') || registry.getComponent?.(e, 'HitShape');
        const teamComp = registry.GetComponent?.(e, 'TeamId') || registry.getComponent?.(e, 'TeamId');
        if (teamComp && (teamComp.team === teamNum || teamComp === teamNum)) {
          continue;
        }
        if (shape && HitQuery.Overlaps(area, shape)) {
          hits.push(e);
        }
      }
    } else if (Array.isArray(registry)) {
      for (const e of registry) {
        if (e.teamId === teamNum) continue;
        if (e.hitShape && HitQuery.Overlaps(area, e.hitShape)) {
          hits.push(e.id !== undefined ? e.id : e);
        }
      }
    }
    return hits;
  }

  static collectOverlapping = HitQuery.CollectOverlapping;
}

export interface SimContext {
  tickNumber: number;
  dt?: number;
  randomSeed?: number;
}

export class CombatSystem {
  private queue: DamageEvent[] = [];
  private registry: any;
  private eventBus: any;

  constructor(registry: any, eventBus?: any) {
    this.registry = registry;
    this.eventBus = eventBus;
  }

  QueueDamage(event: DamageEvent): void {
    this.queue.push({ ...event });
  }

  queueDamage = this.QueueDamage.bind(this);

  Tick(context: SimContext): void {
    const seed = context.randomSeed !== undefined ? context.randomSeed : 42;
    const rng = new SimRandom(seed);

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      const target = event.target;
      const source = event.source;

      // DeadTag check
      if (this.hasDeadTag(target)) {
        continue;
      }

      const sourceStats = this.getStats(source);
      const targetStats = this.getStats(target);

      const resolved = DamagePipeline.Resolve(event, sourceStats, targetStats, rng);

      // Apply health
      const health = this.getHealth(target);
      if (health) {
        health.current = Math.max(0, health.current - resolved.amount);

        const appliedEv: DamageAppliedEvent = {
          source,
          target,
          finalAmount: resolved.amount,
          wasCrit: resolved.crit,
        };

        if (this.eventBus) {
          if (typeof this.eventBus.Enqueue === 'function') {
            this.eventBus.Enqueue(appliedEv);
          } else if (typeof this.eventBus.enqueue === 'function') {
            this.eventBus.enqueue(appliedEv);
          } else if (typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('damageApplied', appliedEv);
          } else if (typeof this.eventBus.publish === 'function') {
            this.eventBus.publish(appliedEv);
          }
        }

        if (health.current <= 0) {
          this.setDeadTag(target);
          const diedEv: EntityDiedEvent = {
            entity: target,
            killer: source,
          };
          if (this.eventBus) {
            if (typeof this.eventBus.Enqueue === 'function') {
              this.eventBus.Enqueue(diedEv);
            } else if (typeof this.eventBus.enqueue === 'function') {
              this.eventBus.enqueue(diedEv);
            } else if (typeof this.eventBus.emit === 'function') {
              this.eventBus.emit('entityDied', diedEv);
            } else if (typeof this.eventBus.publish === 'function') {
              this.eventBus.publish(diedEv);
            }
          }
        }
      }
    }
  }

  tick = this.Tick.bind(this);

  private hasDeadTag(e: any): boolean {
    if (this.registry.HasComponent) {
      return this.registry.HasComponent(e, 'DeadTag');
    }
    if (this.registry.hasComponent) {
      return this.registry.hasComponent(e, 'DeadTag');
    }
    return Boolean(e.isDead);
  }

  private setDeadTag(e: any): void {
    if (this.registry.AddComponent) {
      this.registry.AddComponent(e, 'DeadTag', {});
    } else if (this.registry.addComponent) {
      this.registry.addComponent(e, 'DeadTag', {});
    } else {
      e.isDead = true;
    }
  }

  private getStats(e: any): StatSheet {
    let stats: StatSheet | undefined;
    if (this.registry.GetComponent) {
      stats = this.registry.GetComponent(e, 'StatSheet');
    } else if (this.registry.getComponent) {
      stats = this.registry.getComponent(e, 'StatSheet');
    } else if (e && e.statSheet) {
      stats = e.statSheet;
    }
    if (!stats) {
      stats = {
        attributes: { 0: 0, 1: 0, 2: 0, 3: 0 },
        modifiers: [],
        cachedStats: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 150, 8: 100, 9: 0 },
        isDirty: false,
      };
    }
    return stats;
  }

  private getHealth(e: any): { current: number; max: number } | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'Health');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'Health');
    }
    if (e && e.health !== undefined && e.maxHealth !== undefined) {
      return {
        get current() { return e.health; },
        set current(v: number) { e.health = v; },
        get max() { return e.maxHealth; },
        set max(v: number) { e.maxHealth = v; },
      };
    }
    return undefined;
  }
}

// Backward compatibility helper for UI
export interface DamageCalculationParams {
  baseAmount: number;
  school: DamageSchool;
  flags: number;
  attackerAttackPower: number;
  attackerSpellPower: number;
  attackerCritChance: number;
  attackerCritMultiplier: number;
  targetArmor: number;
  targetEvasion?: number;
}

export function resolveDamagePipeline(params: DamageCalculationParams): {
  damage: number;
  isCrit: boolean;
  isEvaded: boolean;
} {
  if (params.targetEvasion && params.school === DamageSchool.Physical) {
    const evasionChance = Math.min(60, params.targetEvasion) / 100;
    if (Math.random() < evasionChance) {
      return { damage: 0, isCrit: false, isEvaded: true };
    }
  }

  let amount = params.baseAmount;

  if (params.school === DamageSchool.Physical) {
    amount += params.attackerAttackPower * 0.5;
  } else {
    amount += params.attackerSpellPower * 0.5;
  }

  let isCrit = false;
  if ((params.flags & DAMAGE_FLAGS.FLAG_CAN_CRIT) !== 0) {
    const critChance = Math.max(0, params.attackerCritChance) / 100;
    if (Math.random() < critChance) {
      isCrit = true;
      const critMultiplier = Math.max(100, params.attackerCritMultiplier) / 100;
      amount *= critMultiplier;
    }
  }

  if ((params.flags & DAMAGE_FLAGS.FLAG_TRUE_DAMAGE) === 0) {
    if (params.school === DamageSchool.Physical) {
      if ((params.flags & DAMAGE_FLAGS.FLAG_IGNORE_ARMOR) === 0) {
        const armor = Math.max(0, params.targetArmor);
        const reduction = armor / (armor + 100.0);
        amount *= 1.0 - reduction;
      }
    }
  }

  if (amount < 0) {
    amount = 0;
  }

  amount = Math.floor(amount);

  return {
    damage: amount,
    isCrit,
    isEvaded: false,
  };
}

export function getSchoolColor(school: DamageSchool): string {
  switch (school) {
    case DamageSchool.Physical:
      return '#f8fafc';
    case DamageSchool.Fire:
      return '#f97316';
    case DamageSchool.Frost:
      return '#38bdf8';
    case DamageSchool.Arcane:
      return '#c084fc';
    case DamageSchool.Shadow:
      return '#a855f7';
  }
}
