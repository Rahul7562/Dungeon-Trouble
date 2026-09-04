import { DamageSchool } from './types';

export const DAMAGE_FLAGS = {
  FLAG_CAN_CRIT: 1 << 0,
  FLAG_IGNORE_ARMOR: 1 << 1,
  FLAG_TRUE_DAMAGE: 1 << 2,
};

export interface ResolvedDamage {
  amount: number;
  crit: boolean;
}

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
  // Check evasion if target has evasion stat
  if (params.targetEvasion && params.school === DamageSchool.Physical) {
    const evasionChance = Math.min(60, params.targetEvasion) / 100;
    if (Math.random() < evasionChance) {
      return { damage: 0, isCrit: false, isEvaded: true };
    }
  }

  let amount = params.baseAmount;

  // 1. School scaling
  if (params.school === DamageSchool.Physical) {
    amount += params.attackerAttackPower * 0.5;
  } else {
    amount += params.attackerSpellPower * 0.5;
  }

  // 2. Crit roll
  let isCrit = false;
  if ((params.flags & DAMAGE_FLAGS.FLAG_CAN_CRIT) !== 0) {
    const critChance = Math.max(0, params.attackerCritChance) / 100;
    if (Math.random() < critChance) {
      isCrit = true;
      const critMultiplier = Math.max(100, params.attackerCritMultiplier) / 100;
      amount *= critMultiplier;
    }
  }

  // 3. Mitigation
  if ((params.flags & DAMAGE_FLAGS.FLAG_TRUE_DAMAGE) === 0) {
    if (params.school === DamageSchool.Physical) {
      if ((params.flags & DAMAGE_FLAGS.FLAG_IGNORE_ARMOR) === 0) {
        const armor = Math.max(0, params.targetArmor);
        const reduction = armor / (armor + 100.0);
        amount *= 1.0 - reduction;
      }
    }
    // Other schools: magical resistances can apply here
  }

  // 4. Clamp >= 0
  if (amount < 0) {
    amount = 0;
  }

  // 5. Truncate for deterministic calculation matching C++ engine
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
      return '#f8fafc'; // Crisp white
    case DamageSchool.Fire:
      return '#f97316'; // Vivid orange
    case DamageSchool.Frost:
      return '#38bdf8'; // Frost cyan
    case DamageSchool.Arcane:
      return '#c084fc'; // Arcane purple
    case DamageSchool.Shadow:
      return '#a855f7'; // Shadow violet
  }
}
