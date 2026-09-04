import {
  AbilityDef,
  DamageSchool,
  StatusKind,
  StatusEffectDef,
  StatType,
  ModifierOp,
  AbilityCastEvent,
} from './types';
import { DAMAGE_FLAGS, CombatSystem, SimContext } from './combat';
import { StatCalculator } from './stats';

export class AbilityDefTable {
  private abilities = new Map<number, AbilityDef>();

  Register(def: AbilityDef): void {
    this.abilities.set(def.id, { ...def });
  }

  Get(id: number): AbilityDef | undefined {
    return this.abilities.get(id);
  }

  register = this.Register.bind(this);
  get = this.Get.bind(this);
}

export class StatusEffectDefTable {
  private effects = new Map<number, StatusEffectDef>();

  Register(def: StatusEffectDef): void {
    this.effects.set(def.id, { ...def });
  }

  Get(id: number): StatusEffectDef | undefined {
    return this.effects.get(id);
  }

  register = this.Register.bind(this);
  get = this.Get.bind(this);
}

export interface AbilityCastRequest {
  caster: any;
  abilityId: number;
  target: any;
}

export interface LastTickStats {
  casts: number;
  rejected: number;
}

export class AbilitySystem {
  private registry: any;
  private eventBus: any;
  private combatSystem: CombatSystem;
  private abilityTable: AbilityDefTable;
  private statusTable: StatusEffectDefTable;

  private queue: AbilityCastRequest[] = [];
  private lastStats: LastTickStats = { casts: 0, rejected: 0 };

  constructor(
    registry: any,
    eventBus: any,
    combatSystem: CombatSystem,
    abilityTable: AbilityDefTable,
    statusTable: StatusEffectDefTable
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.combatSystem = combatSystem;
    this.abilityTable = abilityTable;
    this.statusTable = statusTable;
  }

  QueueCast(request: AbilityCastRequest): void {
    this.queue.push({ ...request });
  }

  queueCast = this.QueueCast.bind(this);

  GetLastTickStats(): LastTickStats {
    return { ...this.lastStats };
  }

  Tick(context: SimContext): void {
    this.lastStats = { casts: 0, rejected: 0 };
    const tickNumber = context.tickNumber;

    while (this.queue.length > 0) {
      const cast = this.queue.shift()!;
      const ability = this.abilityTable.Get(cast.abilityId);

      // 1. Check ability exists
      if (!ability) {
        this.lastStats.rejected++;
        continue;
      }

      // 2. Check caster is stunned
      if (this.isStunned(cast.caster)) {
        this.lastStats.rejected++;
        continue;
      }

      // 3. Check AbilityBook
      const book = this.getAbilityBook(cast.caster);
      if (!book || !book.abilityIds.includes(cast.abilityId)) {
        this.lastStats.rejected++;
        continue;
      }

      // 4. Check Cooldown
      const readyAt = book.cooldownReadyAtTick[cast.abilityId] || 0;
      if (readyAt > tickNumber) {
        this.lastStats.rejected++;
        continue;
      }

      // 5. Check Mana
      const mana = this.getMana(cast.caster);
      if (mana) {
        if (mana.current < ability.manaCost) {
          this.lastStats.rejected++;
          continue;
        }
        mana.current -= ability.manaCost;
      }

      // Cast accepted!
      this.lastStats.casts++;

      // Set cooldown with CDR
      const casterStats = this.getStatSheet(cast.caster);
      let cdr = 0;
      if (casterStats) {
        cdr = StatCalculator.GetStat(casterStats, StatType.CooldownReduction);
      }
      const baseCooldown = ability.cooldownTicks !== undefined ? ability.cooldownTicks : Math.round((ability.cooldownSec || 0) * 30);
      const effectiveCooldown = Math.floor(baseCooldown * (1.0 - cdr / 100.0));
      book.cooldownReadyAtTick[cast.abilityId] = tickNumber + effectiveCooldown;

      // Emit AbilityCastEvent
      const castEv: AbilityCastEvent = {
        caster: cast.caster,
        abilityId: cast.abilityId,
        target: cast.target,
      };

      if (this.eventBus) {
        if (typeof this.eventBus.Enqueue === 'function') {
          this.eventBus.Enqueue(castEv);
        } else if (typeof this.eventBus.enqueue === 'function') {
          this.eventBus.enqueue(castEv);
        } else if (typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('abilityCast', castEv);
        } else if (typeof this.eventBus.publish === 'function') {
          this.eventBus.publish(castEv);
        }
      }

      // Apply base damage if any
      if (ability.baseDamage > 0) {
        this.combatSystem.QueueDamage({
          source: cast.caster,
          target: cast.target,
          baseAmount: ability.baseDamage,
          school: ability.school,
          flags: ability.damageFlags,
        });
      }

      // Apply status effect if any
      if (ability.appliesStatusId) {
        const statusId = typeof ability.appliesStatusId === 'number'
          ? ability.appliesStatusId
          : parseInt(ability.appliesStatusId, 10);
        if (!isNaN(statusId) && statusId > 0) {
          const statusDef = this.statusTable.Get(statusId);
          if (statusDef) {
            this.applyStatusEffect(cast.target, cast.caster, statusDef);
          }
        }
      }
    }
  }

  tick = this.Tick.bind(this);

  private applyStatusEffect(target: any, source: any, def: StatusEffectDef): void {
    if (def.kind === StatusKind.Stun) {
      if (this.registry.AddComponent) {
        this.registry.AddComponent(target, 'StunnedTag', {});
      } else if (this.registry.addComponent) {
        this.registry.addComponent(target, 'StunnedTag', {});
      } else {
        target.isStunned = true;
      }
    } else if (def.kind === StatusKind.StatBuff && def.statModifier) {
      const stats = this.getStatSheet(target);
      if (stats) {
        const mod = {
          ...def.statModifier,
          sourceId: 2000000 + def.id,
          durationTicks: def.durationTicks,
        };
        StatCalculator.AddModifier(stats, mod);
      }
    }

    // Add to ActiveStatusEffects
    let active = this.getActiveStatusEffects(target);
    if (!active) {
      active = { effects: [] };
      if (this.registry.AddComponent) {
        this.registry.AddComponent(target, 'ActiveStatusEffects', active);
      } else if (this.registry.addComponent) {
        this.registry.addComponent(target, 'ActiveStatusEffects', active);
      } else {
        target.activeStatusEffects = active;
      }
    }

    active.effects.push({
      defId: def.id,
      source,
      remainingTicks: def.durationTicks,
      nextTickIn: def.tickInterval,
    });
  }

  private isStunned(e: any): boolean {
    if (this.registry.HasComponent) {
      return this.registry.HasComponent(e, 'StunnedTag');
    }
    if (this.registry.hasComponent) {
      return this.registry.hasComponent(e, 'StunnedTag');
    }
    return Boolean(e && e.isStunned);
  }

  private getAbilityBook(e: any): { abilityIds: number[]; cooldownReadyAtTick: Record<number, number> } | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'AbilityBook');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'AbilityBook');
    }
    return e?.abilityBook;
  }

  private getMana(e: any): { current: number; max: number } | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'Mana');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'Mana');
    }
    if (e && e.mana !== undefined) {
      return {
        get current() { return e.mana; },
        set current(v: number) { e.mana = v; },
        get max() { return e.maxMana; },
        set max(v: number) { e.maxMana = v; },
      };
    }
    return undefined;
  }

  private getStatSheet(e: any): any {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'StatSheet');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'StatSheet');
    }
    return e?.statSheet;
  }

  private getActiveStatusEffects(e: any): { effects: any[] } | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'ActiveStatusEffects');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'ActiveStatusEffects');
    }
    return e?.activeStatusEffects;
  }
}

export class StatusEffectSystem {
  private registry: any;
  private combatSystem: CombatSystem;
  private statusTable: StatusEffectDefTable;

  constructor(registry: any, combatSystem: CombatSystem, statusTable: StatusEffectDefTable) {
    this.registry = registry;
    this.combatSystem = combatSystem;
    this.statusTable = statusTable;
  }

  Tick(context: SimContext): void {
    // Find all entities with ActiveStatusEffects
    let entities: any[] = [];
    if (typeof this.registry.getAllWithComponents === 'function') {
      entities = this.registry.getAllWithComponents(['ActiveStatusEffects']);
    } else if (typeof this.registry.view === 'function') {
      entities = this.registry.view('ActiveStatusEffects');
    } else if (Array.isArray(this.registry.entities)) {
      entities = this.registry.entities.filter((e: any) =>
        this.registry.hasComponent?.(e, 'ActiveStatusEffects') || e.activeStatusEffects
      );
    } else if (Array.isArray(this.registry)) {
      entities = this.registry;
    }

    for (const e of entities) {
      const active = this.getActiveStatusEffects(e);
      if (!active || !active.effects) continue;

      for (let i = active.effects.length - 1; i >= 0; i--) {
        const inst = active.effects[i];
        const def = this.statusTable.Get(inst.defId);
        if (!def) continue;

        inst.remainingTicks--;
        inst.nextTickIn--;

        if (inst.nextTickIn <= 0) {
          if (def.kind === StatusKind.DamageOverTime && def.magnitudePerTick) {
            this.combatSystem.QueueDamage({
              source: inst.source,
              target: e,
              baseAmount: def.magnitudePerTick,
              school: def.school || DamageSchool.Physical,
              flags: 0,
            });
          }
          inst.nextTickIn = def.tickInterval;
        }

        if (inst.remainingTicks <= 0) {
          active.effects.splice(i, 1);

          if (def.kind === StatusKind.Stun) {
            // Check if another active stun remains
            const hasOtherStun = active.effects.some((eff: any) => {
              const otherDef = this.statusTable.Get(eff.defId);
              return otherDef?.kind === StatusKind.Stun;
            });
            if (!hasOtherStun) {
              if (this.registry.RemoveComponent) {
                this.registry.RemoveComponent(e, 'StunnedTag');
              } else if (this.registry.removeComponent) {
                this.registry.removeComponent(e, 'StunnedTag');
              } else {
                e.isStunned = false;
              }
            }
          } else if (def.kind === StatusKind.StatBuff) {
            const stats = this.getStatSheet(e);
            if (stats) {
              StatCalculator.RemoveModifiersFromSource(stats, 2000000 + def.id);
            }
          }
        }
      }
    }
  }

  tick = this.Tick.bind(this);

  private getActiveStatusEffects(e: any): { effects: any[] } | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'ActiveStatusEffects');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'ActiveStatusEffects');
    }
    return e?.activeStatusEffects;
  }

  private getStatSheet(e: any): any {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'StatSheet');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'StatSheet');
    }
    return e?.statSheet;
  }
}

export const PLAYER_ABILITIES: AbilityDef[] = [
  {
    id: 1,
    name: 'Twin Slash',
    key: '1 / L-Click',
    description: 'A swift physical cleave that cuts through all foes in front of you.',
    icon: 'Sword',
    baseDamage: 25,
    school: DamageSchool.Physical,
    damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
    cooldownSec: 0.35,
    cooldownTicks: 10,
    manaCost: 0,
    range: 110,
    radius: 90,
  },
  {
    id: 2,
    name: 'Inferno Burst',
    key: '2 / Q',
    description: 'Unleashes a detonating sphere of fire that scorches surrounding enemies.',
    icon: 'Flame',
    baseDamage: 55,
    school: DamageSchool.Fire,
    damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
    cooldownSec: 3.5,
    cooldownTicks: 105,
    manaCost: 20,
    range: 220,
    radius: 120,
    appliesStatusId: 'burn',
  },
  {
    id: 3,
    name: 'Frost Nova',
    key: '3 / E',
    description: 'Freezes the ground around you, damaging and severely chilling foes.',
    icon: 'Snowflake',
    baseDamage: 40,
    school: DamageSchool.Frost,
    damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
    cooldownSec: 6.0,
    cooldownTicks: 180,
    manaCost: 25,
    range: 0,
    radius: 180,
    appliesStatusId: 'chill',
  },
  {
    id: 4,
    name: 'Aether Dash',
    key: 'Space',
    description: 'Instant arcane teleport forward that evades strikes and leaves an ethereal shockwave.',
    icon: 'Zap',
    baseDamage: 15,
    school: DamageSchool.Arcane,
    damageFlags: DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
    cooldownSec: 2.2,
    cooldownTicks: 66,
    manaCost: 15,
    range: 220,
    radius: 70,
  },
];
