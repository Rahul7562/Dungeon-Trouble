import {
  ItemDef,
  ItemRarity,
  EquipSlot,
  StatType,
  ModifierOp,
  ItemStack,
} from './types';

export const ITEM_REGISTRY: Record<number, ItemDef> = {
  1: {
    id: 1,
    name: 'Rusty Shortsword',
    rarity: ItemRarity.Common,
    slot: EquipSlot.MainHand,
    description: 'An old iron blade with slight notches. Still sharp enough to cleave bone.',
    icon: 'Sword',
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 5 },
    ],
  },
  2: {
    id: 2,
    name: 'Reinforced Iron Armor',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.Chest,
    description: 'Forged plate offering solid physical deflection.',
    icon: 'Shield',
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 15 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 25 },
    ],
  },
  3: {
    id: 3,
    name: 'Shadowrunner Boots',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Boots,
    description: 'Lightweight leather imbued with swift dungeon enchantments.',
    icon: 'Footprints',
    equipModifiers: [
      { stat: StatType.MoveSpeed, op: ModifierOp.Percent, value: 20 },
      { stat: StatType.Evasion, op: ModifierOp.Flat, value: 8 },
    ],
  },
  4: {
    id: 4,
    name: 'Crown of the Spellweaver',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Head,
    description: 'Resonates with high arcane frequencies, boosting magical potency.',
    icon: 'Crown',
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 24 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 50 },
      { stat: StatType.CooldownReduction, op: ModifierOp.Percent, value: 15 },
    ],
  },
  5: {
    id: 5,
    name: 'Heart of the Dragon Greaves',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Legs,
    description: 'Heavy dragon-scale plating giving unparalleled resilience.',
    icon: 'ShieldAlert',
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 25 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 60 },
    ],
  },
  6: {
    id: 6,
    name: 'Cataclysm - Ruin Blade',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.MainHand,
    description: 'A cataclysmic relic discovered in the deepest abyss. Radiates destructive power.',
    icon: 'Flame',
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 45 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 18 },
      { stat: StatType.CritMultiplier, op: ModifierOp.Percent, value: 40 },
    ],
  },
  7: {
    id: 7,
    name: 'Aegis of the Sun',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.OffHand,
    description: 'A polished shield bearing the crest of a fallen sun deity.',
    icon: 'Shield',
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 20 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 35 },
    ],
  },
  8: {
    id: 8,
    name: 'Band of the Assassin',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Ring,
    description: 'Hones lethal reflexes and precision strikes.',
    icon: 'CircleDot',
    equipModifiers: [
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 10 },
      { stat: StatType.Evasion, op: ModifierOp.Flat, value: 12 },
    ],
  },
  9: {
    id: 9,
    name: 'Amulet of Eternal Vitality',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Amulet,
    description: 'Warm to the touch, this talisman infuses the wearer with steady vigor.',
    icon: 'Gem',
    equipModifiers: [
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 80 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 40 },
    ],
  },
  10: {
    id: 10,
    name: 'Health Elixir',
    rarity: ItemRarity.Common,
    slot: EquipSlot.None,
    description: 'Restores 50 Health immediately upon consumption.',
    icon: 'Heart',
    equipModifiers: [],
  },
  11: {
    id: 11,
    name: 'Mana Flask',
    rarity: ItemRarity.Common,
    slot: EquipSlot.None,
    description: 'Restores 40 Mana immediately upon consumption.',
    icon: 'Sparkles',
    equipModifiers: [],
  },
};

export function getItemDef(id: number): ItemDef | undefined {
  return ITEM_REGISTRY[id];
}

export function createItemStack(itemDefId: number, count = 1): ItemStack {
  return {
    instanceId: Math.random().toString(36).substring(2, 9),
    itemDefId,
    count,
  };
}

export function getRarityColor(rarity: ItemRarity): string {
  switch (rarity) {
    case ItemRarity.Common:
      return 'text-slate-300 border-slate-600 bg-slate-800/60';
    case ItemRarity.Uncommon:
      return 'text-emerald-400 border-emerald-600 bg-emerald-950/40';
    case ItemRarity.Rare:
      return 'text-sky-400 border-sky-600 bg-sky-950/40';
    case ItemRarity.Epic:
      return 'text-purple-400 border-purple-600 bg-purple-950/40';
    case ItemRarity.Legendary:
      return 'text-amber-400 border-amber-500 bg-amber-950/50 shadow-amber-500/20 shadow-md';
  }
}

export function getRarityBadgeColor(rarity: ItemRarity): string {
  switch (rarity) {
    case ItemRarity.Common:
      return 'bg-slate-700 text-slate-200';
    case ItemRarity.Uncommon:
      return 'bg-emerald-900/80 text-emerald-300 border border-emerald-700';
    case ItemRarity.Rare:
      return 'bg-sky-900/80 text-sky-300 border border-sky-700';
    case ItemRarity.Epic:
      return 'bg-purple-900/80 text-purple-300 border border-purple-700';
    case ItemRarity.Legendary:
      return 'bg-amber-900/80 text-amber-300 border border-amber-600 font-bold animate-pulse';
  }
}

export function getRarityName(rarity: ItemRarity): string {
  switch (rarity) {
    case ItemRarity.Common:
      return 'Common';
    case ItemRarity.Uncommon:
      return 'Uncommon';
    case ItemRarity.Rare:
      return 'Rare';
    case ItemRarity.Epic:
      return 'Epic';
    case ItemRarity.Legendary:
      return 'Legendary';
  }
}
