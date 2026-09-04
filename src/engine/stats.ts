import {
  AttributeType,
  StatType,
  ModifierOp,
  EquipmentState,
  StatModifier,
} from './types';
import { getItemDef } from './items';

export const StatFormulas = {
  BaseMaxHealth: 50.0,
  MaxHealthPerVit: 10.0,

  BaseMaxMana: 30.0,
  MaxManaPerInt: 8.0,

  AttackPowerPerStr: 2.0,
  AttackPowerPerDex: 1.0,

  SpellPowerPerInt: 2.0,

  ArmorPerStr: 0.5,
  ArmorPerDex: 0.5,

  EvasionPerDex: 0.3,

  BaseCritChance: 5.0,
  CritChancePerDex: 0.1,

  BaseCritMultiplier: 150.0,
  BaseMoveSpeed: 100.0,
  BaseCooldownReduction: 0.0,
};

export function calculateBaseStats(attributes: Record<AttributeType, number>): Record<StatType, number> {
  const str = attributes[AttributeType.STR] || 0;
  const dex = attributes[AttributeType.DEX] || 0;
  const int = attributes[AttributeType.INT] || 0;
  const vit = attributes[AttributeType.VIT] || 0;

  return {
    [StatType.MaxHealth]: StatFormulas.BaseMaxHealth + vit * StatFormulas.MaxHealthPerVit,
    [StatType.MaxMana]: StatFormulas.BaseMaxMana + int * StatFormulas.MaxManaPerInt,
    [StatType.AttackPower]: str * StatFormulas.AttackPowerPerStr + dex * StatFormulas.AttackPowerPerDex,
    [StatType.SpellPower]: int * StatFormulas.SpellPowerPerInt,
    [StatType.Armor]: str * StatFormulas.ArmorPerStr + dex * StatFormulas.ArmorPerDex,
    [StatType.Evasion]: dex * StatFormulas.EvasionPerDex,
    [StatType.CritChance]: StatFormulas.BaseCritChance + dex * StatFormulas.CritChancePerDex,
    [StatType.CritMultiplier]: StatFormulas.BaseCritMultiplier,
    [StatType.MoveSpeed]: StatFormulas.BaseMoveSpeed,
    [StatType.CooldownReduction]: StatFormulas.BaseCooldownReduction,
  };
}

export function computeTotalStats(
  attributes: Record<AttributeType, number>,
  equipment: EquipmentState
): Record<StatType, number> {
  const base = calculateBaseStats(attributes);
  const flatMods: Record<StatType, number> = {
    [StatType.MaxHealth]: 0,
    [StatType.MaxMana]: 0,
    [StatType.AttackPower]: 0,
    [StatType.SpellPower]: 0,
    [StatType.Armor]: 0,
    [StatType.Evasion]: 0,
    [StatType.CritChance]: 0,
    [StatType.CritMultiplier]: 0,
    [StatType.MoveSpeed]: 0,
    [StatType.CooldownReduction]: 0,
  };

  const percentMods: Record<StatType, number> = {
    [StatType.MaxHealth]: 0,
    [StatType.MaxMana]: 0,
    [StatType.AttackPower]: 0,
    [StatType.SpellPower]: 0,
    [StatType.Armor]: 0,
    [StatType.Evasion]: 0,
    [StatType.CritChance]: 0,
    [StatType.CritMultiplier]: 0,
    [StatType.MoveSpeed]: 0,
    [StatType.CooldownReduction]: 0,
  };

  for (const slotKey of Object.keys(equipment)) {
    const stack = equipment[Number(slotKey) as keyof EquipmentState];
    if (!stack) continue;
    const def = getItemDef(stack.itemDefId);
    if (!def || !def.equipModifiers) continue;

    for (const mod of def.equipModifiers) {
      if (mod.op === ModifierOp.Flat) {
        flatMods[mod.stat] += mod.value;
      } else if (mod.op === ModifierOp.Percent) {
        percentMods[mod.stat] += mod.value;
      }
    }
  }

  const result: Record<StatType, number> = { ...base };
  for (const statKey of Object.keys(result)) {
    const st = Number(statKey) as StatType;
    const baseVal = base[st] + flatMods[st];
    const multiplier = 1 + percentMods[st] / 100;
    result[st] = Math.max(0, Math.round(baseVal * multiplier * 10) / 10);
  }

  return result;
}

export function getStatName(stat: StatType): string {
  switch (stat) {
    case StatType.MaxHealth:
      return 'Max Health';
    case StatType.MaxMana:
      return 'Max Mana';
    case StatType.AttackPower:
      return 'Attack Power';
    case StatType.SpellPower:
      return 'Spell Power';
    case StatType.Armor:
      return 'Armor';
    case StatType.Evasion:
      return 'Evasion';
    case StatType.CritChance:
      return 'Crit Chance';
    case StatType.CritMultiplier:
      return 'Crit Multiplier';
    case StatType.MoveSpeed:
      return 'Move Speed';
    case StatType.CooldownReduction:
      return 'Cooldown Reduction';
  }
}
