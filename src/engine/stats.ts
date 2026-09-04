import {
  AttributeType,
  StatType,
  ModifierOp,
  EquipmentState,
  StatModifier,
  StatSheet,
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

  CalculateBaseStats(attributes: Record<AttributeType, number>): Record<StatType, number> {
    return calculateBaseStats(attributes);
  }
};

export function createStatSheet(attributes?: Partial<Record<AttributeType, number>>): StatSheet {
  const attrs: Record<AttributeType, number> = {
    [AttributeType.STR]: attributes?.[AttributeType.STR] ?? 0,
    [AttributeType.DEX]: attributes?.[AttributeType.DEX] ?? 0,
    [AttributeType.INT]: attributes?.[AttributeType.INT] ?? 0,
    [AttributeType.VIT]: attributes?.[AttributeType.VIT] ?? 0,
  };

  const initialStats = calculateBaseStats(attrs);

  return {
    attributes: attrs,
    modifiers: [],
    cachedStats: initialStats,
    isDirty: true,
  };
}

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

export class StatCalculator {
  static Recalculate(sheet: StatSheet): void {
    const baseStats = calculateBaseStats(sheet.attributes);

    const flatAdd: Record<StatType, number> = {
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

    const percentAdd: Record<StatType, number> = {
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

    const percentMult: Record<StatType, number> = {
      [StatType.MaxHealth]: 1.0,
      [StatType.MaxMana]: 1.0,
      [StatType.AttackPower]: 1.0,
      [StatType.SpellPower]: 1.0,
      [StatType.Armor]: 1.0,
      [StatType.Evasion]: 1.0,
      [StatType.CritChance]: 1.0,
      [StatType.CritMultiplier]: 1.0,
      [StatType.MoveSpeed]: 1.0,
      [StatType.CooldownReduction]: 1.0,
    };

    for (const mod of sheet.modifiers) {
      if (mod.op === ModifierOp.Flat) {
        flatAdd[mod.stat] += mod.value;
      } else if (mod.op === ModifierOp.PercentAdd) {
        percentAdd[mod.stat] += mod.value;
      } else if (mod.op === ModifierOp.PercentMult) {
        percentMult[mod.stat] *= (1.0 + mod.value / 100.0);
      }
    }

    const statCount = 10;
    for (let i = 0; i < statCount; i++) {
      const st = i as StatType;
      const val = (baseStats[st] + flatAdd[st]) * (1.0 + percentAdd[st] / 100.0) * percentMult[st];
      sheet.cachedStats[st] = val;
    }

    sheet.isDirty = false;
  }

  static GetStat(sheet: StatSheet, stat: StatType): number {
    if (sheet.isDirty) {
      StatCalculator.Recalculate(sheet);
    }
    return sheet.cachedStats[stat];
  }

  static AddModifier(sheet: StatSheet, modifier: StatModifier): void {
    sheet.modifiers.push(modifier);
    sheet.isDirty = true;
  }

  static RemoveModifiersFromSource(sheet: StatSheet, sourceId: number): void {
    const before = sheet.modifiers.length;
    sheet.modifiers = sheet.modifiers.filter(m => m.sourceId !== sourceId);
    if (sheet.modifiers.length !== before) {
      sheet.isDirty = true;
    }
  }

  static TickModifiers(sheet: StatSheet): void {
    let removed = false;
    for (let i = sheet.modifiers.length - 1; i >= 0; i--) {
      const mod = sheet.modifiers[i];
      if (mod.durationTicks !== undefined && mod.durationTicks > 0) {
        mod.durationTicks--;
        if (mod.durationTicks === 0) {
          sheet.modifiers.splice(i, 1);
          removed = true;
        }
      }
    }
    if (removed) {
      sheet.isDirty = true;
    }
  }

  // Lowercase aliases for convenience
  static recalculate = StatCalculator.Recalculate;
  static getStat = StatCalculator.GetStat;
  static addModifier = StatCalculator.AddModifier;
  static removeModifiersFromSource = StatCalculator.RemoveModifiersFromSource;
  static tickModifiers = StatCalculator.TickModifiers;
}

export function computeTotalStats(
  attributes: Record<AttributeType, number>,
  equipment: EquipmentState
): Record<StatType, number> {
  const sheet = createStatSheet(attributes);

  for (const slotKey of Object.keys(equipment)) {
    const stack = equipment[Number(slotKey) as keyof EquipmentState];
    if (!stack) continue;
    const def = getItemDef(stack.itemDefId);
    if (!def || !def.equipModifiers) continue;

    const sourceId = 1000000 + Number(slotKey);
    for (const mod of def.equipModifiers) {
      StatCalculator.AddModifier(sheet, {
        ...mod,
        sourceId,
      });
    }
  }

  StatCalculator.Recalculate(sheet);
  return { ...sheet.cachedStats };
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
