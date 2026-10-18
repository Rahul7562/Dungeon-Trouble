import {
  ItemDef,
  ItemRarity,
  EquipSlot,
  StatType,
  ModifierOp,
  ItemStack,
  StatSheet,
  StatModifier,
  EquipmentState,
} from './types';
import { StatCalculator } from './stats';

export class Result<T> {
  private ok: boolean;
  private value?: T;
  private error?: string;

  constructor(ok: boolean, value?: T, error?: string) {
    this.ok = ok;
    this.value = value;
    this.error = error;
  }

  static Ok<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static Error<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  IsOk(): boolean { return this.ok; }
  IsError(): boolean { return !this.ok; }
  Get(): T { return this.value!; }
  GetError(): string { return this.error || ''; }

  // Lowercase aliases
  isOk(): boolean { return this.ok; }
  isError(): boolean { return !this.ok; }
  get(): T { return this.value!; }
  getError(): string { return this.error || ''; }
}

export class ItemDefTable {
  private items = new Map<number, ItemDef>();

  Register(def: ItemDef): void {
    this.items.set(def.id, { ...def });
  }

  Get(id: number): ItemDef | undefined {
    return this.items.get(id);
  }

  register = this.Register.bind(this);
  get = this.Get.bind(this);

  LoadFromJson(jsonString: string): Result<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return Result.Error('Expected JSON array of items');
      }

      for (const raw of parsed) {
        if (raw.id === undefined || typeof raw.id !== 'number') {
          return Result.Error('Item is missing required "id" attribute');
        }

        const rarityStr = String(raw.rarity || 'Common').toLowerCase();
        let rarity = ItemRarity.Common;
        if (rarityStr === 'uncommon') rarity = ItemRarity.Uncommon;
        else if (rarityStr === 'rare') rarity = ItemRarity.Rare;
        else if (rarityStr === 'epic') rarity = ItemRarity.Epic;
        else if (rarityStr === 'legendary') rarity = ItemRarity.Legendary;

        const slotStr = String(raw.slot || 'None').toLowerCase();
        let slot = EquipSlot.None;
        if (slotStr === 'head') slot = EquipSlot.Head;
        else if (slotStr === 'chest') slot = EquipSlot.Chest;
        else if (slotStr === 'legs') slot = EquipSlot.Legs;
        else if (slotStr === 'boots') slot = EquipSlot.Boots;
        else if (slotStr === 'mainhand') slot = EquipSlot.MainHand;
        else if (slotStr === 'offhand') slot = EquipSlot.OffHand;
        else if (slotStr === 'ring') slot = EquipSlot.Ring;
        else if (slotStr === 'amulet') slot = EquipSlot.Amulet;

        const equipModifiers: any[] = [];
        if (Array.isArray(raw.equipModifiers)) {
          for (const m of raw.equipModifiers) {
            let stat = StatType.AttackPower;
            const statStr = String(m.stat || '').toLowerCase();
            if (statStr === 'maxhealth') stat = StatType.MaxHealth;
            else if (statStr === 'maxmana') stat = StatType.MaxMana;
            else if (statStr === 'attackpower') stat = StatType.AttackPower;
            else if (statStr === 'spellpower') stat = StatType.SpellPower;
            else if (statStr === 'armor') stat = StatType.Armor;
            else if (statStr === 'evasion') stat = StatType.Evasion;
            else if (statStr === 'critchance') stat = StatType.CritChance;
            else if (statStr === 'critmultiplier') stat = StatType.CritMultiplier;
            else if (statStr === 'movespeed') stat = StatType.MoveSpeed;
            else if (statStr === 'cooldownreduction') stat = StatType.CooldownReduction;

            let op = ModifierOp.Flat;
            const opStr = String(m.op || '').toLowerCase();
            if (opStr === 'percentadd' || opStr === 'percent') op = ModifierOp.PercentAdd;
            else if (opStr === 'percentmult') op = ModifierOp.PercentMult;

            equipModifiers.push({
              sourceId: m.sourceId ?? 0,
              stat,
              op,
              value: Number(m.value) || 0,
              durationTicks: m.durationTicks ?? -1,
            });
          }
        }

        const def: ItemDef = {
          id: raw.id,
          name: raw.name || `Item ${raw.id}`,
          rarity,
          slot,
          maxStack: raw.maxStack ?? (slot === EquipSlot.None ? 20 : 1),
          equipModifiers,
        };

        this.Register(def);
      }

      return Result.Ok(true);
    } catch (e: any) {
      return Result.Error(`JSON parsing error: ${e.message || String(e)}`);
    }
  }

  loadFromJson = this.LoadFromJson.bind(this);
}

export interface InventorySlot {
  defId: number;
  count: number;
}

export class Inventory {
  slots: InventorySlot[];

  constructor(size = 12) {
    this.slots = [];
    for (let i = 0; i < size; i++) {
      this.slots.push({ defId: 0, count: 0 });
    }
  }

  AddItem(table: ItemDefTable, defId: number, count: number): number {
    const def = table.Get(defId);
    const maxStack = def?.maxStack ?? 1;
    let remaining = count;

    // 1. Stack into existing non-full slots
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.defId === defId && slot.count < maxStack) {
        const canAdd = maxStack - slot.count;
        const add = Math.min(canAdd, remaining);
        slot.count += add;
        remaining -= add;
        if (remaining <= 0) return 0;
      }
    }

    // 2. Put into empty slots
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.defId === 0 || slot.count === 0) {
        slot.defId = defId;
        const add = Math.min(maxStack, remaining);
        slot.count = add;
        remaining -= add;
        if (remaining <= 0) return 0;
      }
    }

    return remaining;
  }

  addItem = this.AddItem.bind(this);

  RemoveItem(defId: number, count: number): number {
    let toRemove = count;
    let removedTotal = 0;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.defId === defId && slot.count > 0) {
        const take = Math.min(slot.count, toRemove);
        slot.count -= take;
        toRemove -= take;
        removedTotal += take;

        if (slot.count === 0) {
          slot.defId = 0;
        }

        if (toRemove <= 0) break;
      }
    }

    return removedTotal;
  }

  removeItem = this.RemoveItem.bind(this);

  CountOf(defId: number): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot.defId === defId) {
        total += slot.count;
      }
    }
    return total;
  }

  countOf = this.CountOf.bind(this);
}

export class Equipment {
  slots: number[] = new Array(9).fill(0); // EquipSlot enum indices 0..8
}

export class EquipmentOps {
  static Equip(
    equip: Equipment | any,
    stats: StatSheet,
    table: ItemDefTable,
    itemDefId: number
  ): Result<number> {
    const def = table.Get(itemDefId);
    if (!def || def.slot === EquipSlot.None) {
      return Result.Error(`Item ${itemDefId} cannot be equipped in slot None`);
    }

    const slotIndex = def.slot;
    const slotSourceId = 1000000 + slotIndex;

    let oldItemId = 0;
    if (equip.slots !== undefined) {
      oldItemId = equip.slots[slotIndex] || 0;
    } else if (equip[slotIndex] !== undefined) {
      oldItemId = typeof equip[slotIndex] === 'number' ? equip[slotIndex] : (equip[slotIndex]?.itemDefId || 0);
    }

    // Unequip old item stats
    if (oldItemId !== 0) {
      StatCalculator.RemoveModifiersFromSource(stats, slotSourceId);
    }

    // Set new slot
    if (equip.slots !== undefined) {
      equip.slots[slotIndex] = itemDefId;
    } else {
      equip[slotIndex] = {
        instanceId: String(itemDefId),
        itemDefId,
        count: 1,
      };
    }

    // Apply new modifiers
    if (def.equipModifiers) {
      for (const mod of def.equipModifiers) {
        StatCalculator.AddModifier(stats, {
          ...mod,
          sourceId: slotSourceId,
        });
      }
    }

    return Result.Ok(oldItemId);
  }

  static equip = EquipmentOps.Equip;

  static Unequip(
    equip: Equipment | any,
    stats: StatSheet,
    slot: EquipSlot
  ): number {
    const slotSourceId = 1000000 + slot;
    let oldItemId = 0;
    if (equip.slots !== undefined) {
      oldItemId = equip.slots[slot] || 0;
    } else if (equip[slot] !== undefined) {
      oldItemId = typeof equip[slot] === 'number' ? equip[slot] : (equip[slot]?.itemDefId || 0);
    }

    if (oldItemId !== 0) {
      StatCalculator.RemoveModifiersFromSource(stats, slotSourceId);
      if (equip.slots !== undefined) {
        equip.slots[slot] = 0;
      } else {
        equip[slot] = null;
      }
    }

    return oldItemId;
  }

  static unequip = EquipmentOps.Unequip;
}

export const ITEM_REGISTRY: Record<number, ItemDef> = {
  1: {
    id: 1,
    name: 'Rusty Shortsword',
    rarity: ItemRarity.Common,
    slot: EquipSlot.MainHand,
    description: 'An old iron blade with slight notches. Still sharp enough to cleave bone.',
    icon: 'Sword',
    maxStack: 1,
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
    maxStack: 1,
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
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 20 },
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
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 24 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 50 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 15 },
    ],
  },
  5: {
    id: 5,
    name: 'Heart of the Dragon Greaves',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Legs,
    description: 'Heavy dragon-scale plating giving unparalleled resilience.',
    icon: 'ShieldAlert',
    maxStack: 1,
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
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 45 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 18 },
      { stat: StatType.CritMultiplier, op: ModifierOp.PercentAdd, value: 40 },
    ],
  },
  7: {
    id: 7,
    name: 'Aegis of the Sun',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.OffHand,
    description: 'A polished shield bearing the crest of a fallen sun deity.',
    icon: 'Shield',
    maxStack: 1,
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
    maxStack: 1,
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
    maxStack: 1,
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
    maxStack: 20,
    equipModifiers: [],
  },
  11: {
    id: 11,
    name: 'Mana Flask',
    rarity: ItemRarity.Common,
    slot: EquipSlot.None,
    description: 'Restores 40 Mana immediately upon consumption.',
    icon: 'Sparkles',
    maxStack: 20,
    equipModifiers: [],
  },
  12: {
    id: 12,
    name: 'Phoenix Flame Mantle',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.Chest,
    description: 'Forged within primordial volcanic embers. Grants fire resistance and immense resilience.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 35 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 90 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 20 },
    ],
  },
  13: {
    id: 13,
    name: 'Boots of the Windstrider',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.Boots,
    description: 'Legendary footwear allowing the wearer to glide effortlessly across treacherous terrain.',
    icon: 'Footprints',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 35 },
      { stat: StatType.Evasion, op: ModifierOp.Flat, value: 20 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 15 },
    ],
  },
  14: {
    id: 14,
    name: 'Elixir of Regeneration',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.None,
    description: 'A soothing concoction that accelerates cellular recovery, restoring health over time.',
    icon: 'Sparkles',
    maxStack: 20,
    equipModifiers: [],
  },
  15: {
    id: 15,
    name: "Hunter's Recurve Bow",
    rarity: ItemRarity.Common,
    slot: EquipSlot.MainHand,
    description: 'A flexible yew bow crafted for rapid, accurate volley fire.',
    icon: 'Crosshair',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 8 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 5 },
    ],
  },
  16: {
    id: 16,
    name: 'Apprentice Arcane Staff',
    rarity: ItemRarity.Common,
    slot: EquipSlot.MainHand,
    description: 'A polished oak staff crowned with a glowing mana crystal.',
    icon: 'Wand',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 12 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 25 },
    ],
  },
  17: {
    id: 17,
    name: 'Bone Wand of Decay',
    rarity: ItemRarity.Common,
    slot: EquipSlot.MainHand,
    description: 'Carved from ancient marrow, whispers of the dead emanate from its tip.',
    icon: 'Wand',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 10 },
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 6 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 15 },
    ],
  },
  18: {
    id: 18,
    name: 'Steel Broadsword',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.MainHand,
    description: 'A heavy forged steel blade designed to cleave through mail and bone.',
    icon: 'Sword',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 14 },
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 5 },
    ],
  },
  19: {
    id: 19,
    name: "Ranger's Quiver",
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.OffHand,
    description: 'Filled with fletched arrows that grant swift recovery and agility.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 6 },
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 8 },
    ],
  },
  20: {
    id: 20,
    name: 'Spell Tome of Sparks',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.OffHand,
    description: 'An illuminated grimoire humming with elemental incantations.',
    icon: 'BookOpen',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 10 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 30 },
    ],
  },
  21: {
    id: 21,
    name: 'Skull of the Fallen',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.OffHand,
    description: 'A morbid relic that anchors necrotic energies and vitality.',
    icon: 'Skull',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 8 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 30 },
    ],
  },
  22: {
    id: 22,
    name: "Knight's Plate Mail",
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Chest,
    description: 'Heavy tempered steel chestplate bearing the crest of the realm.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 24 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 45 },
    ],
  },
  23: {
    id: 23,
    name: "Hunter's Leather Tunic",
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Chest,
    description: 'Supple beast hide offering unrestricted movement and camouflaged evasion.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 12 },
      { stat: StatType.Evasion, op: ModifierOp.Flat, value: 15 },
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 8 },
    ],
  },
  24: {
    id: 24,
    name: 'Silk Robes of the Magus',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Chest,
    description: 'Enchanted silk woven with starlight, amplifying mana reserves.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 8 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 25 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 60 },
    ],
  },
  25: {
    id: 25,
    name: "Deathknight's Shroud",
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Chest,
    description: 'Dark mail cursed by shadow, protecting the wearer through necrotic siphon.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 18 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 14 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 50 },
    ],
  },
  26: {
    id: 26,
    name: 'Greater Health Potion',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.None,
    description: 'Restores 120 Health instantly upon consumption.',
    icon: 'Heart',
    maxStack: 20,
    equipModifiers: [],
  },
  27: {
    id: 27,
    name: 'Greater Mana Flask',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.None,
    description: 'Restores 100 Mana instantly upon consumption.',
    icon: 'Sparkles',
    maxStack: 20,
    equipModifiers: [],
  },
  28: {
    id: 28,
    name: 'Ring of the Dungeon Master',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Ring,
    description: 'Infused with the essence of conquered crypts. Enhances all martial and arcane arts.',
    icon: 'CircleDot',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 16 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 16 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 10 },
    ],
  },
  29: {
    id: 29,
    name: 'Amulet of the Ancients',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.Amulet,
    description: 'Ancient pendant vibrating with deep dungeon power.',
    icon: 'Gem',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 100 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 60 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 12 },
    ],
  },
  30: {
    id: 30,
    name: "Champion's Warblade",
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.MainHand,
    description: 'A masterwork relic blade etched with glowing runes of conquest.',
    icon: 'Sword',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 50 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 20 },
      { stat: StatType.CritMultiplier, op: ModifierOp.PercentAdd, value: 45 },
    ],
  },
  31: {
    id: 31,
    name: 'Iron Vanguard Helm',
    rarity: ItemRarity.Common,
    slot: EquipSlot.Head,
    description: 'A sturdy kettle helm worn by catacomb sentries.',
    icon: 'Crown',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 8 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 20 },
    ],
  },
  32: {
    id: 32,
    name: 'Cowl of Whispering Shadows',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Head,
    description: 'Woven from dusk-silk, sharpening arcane focus and critical precision.',
    icon: 'Crown',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 14 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 8 },
      { stat: StatType.Evasion, op: ModifierOp.Flat, value: 10 },
    ],
  },
  33: {
    id: 33,
    name: 'Chainmail Chausses',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.Legs,
    description: 'Interlocking steel rings protecting the legs against low cleaves.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 12 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 30 },
    ],
  },
  34: {
    id: 34,
    name: 'Frostweave Legguards',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Legs,
    description: 'Infused with glacial rime, bolstering mana reserves and defense.',
    icon: 'Shield',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 16 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 45 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 12 },
    ],
  },
  35: {
    id: 35,
    name: 'Ironclad Sabatons',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.Boots,
    description: 'Heavy plated boots that anchor the warrior against knockback.',
    icon: 'Footprints',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.Armor, op: ModifierOp.Flat, value: 10 },
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 12 },
    ],
  },
  36: {
    id: 36,
    name: 'Signet of Ember Might',
    rarity: ItemRarity.Uncommon,
    slot: EquipSlot.Ring,
    description: 'A brass ring set with a warm volcanic garnet.',
    icon: 'CircleDot',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 9 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 9 },
    ],
  },
  37: {
    id: 37,
    name: 'Pendant of the Frozen Star',
    rarity: ItemRarity.Rare,
    slot: EquipSlot.Amulet,
    description: 'Crystallized starlight that hastens spell recovery.',
    icon: 'Gem',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 45 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 10 },
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 14 },
    ],
  },
  38: {
    id: 38,
    name: 'Voidrender Longbow',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.MainHand,
    description: 'Fires arrows wreathed in abyssal lightning that pierce armor.',
    icon: 'Crosshair',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 44 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 22 },
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 15 },
    ],
  },
  39: {
    id: 39,
    name: 'Staff of the Cosmos',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.MainHand,
    description: 'Channels the primordial fury of stars and frost.',
    icon: 'Wand',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 55 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 85 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 20 },
    ],
  },
  40: {
    id: 40,
    name: 'Soulreaper Scythe of the Lich',
    rarity: ItemRarity.Legendary,
    slot: EquipSlot.MainHand,
    description: 'An abyssal bone-forged scythe that harvests the life force of fallen dungeon lords.',
    icon: 'Skull',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 48 },
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 24 },
      { stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 95 },
      { stat: StatType.CooldownReduction, op: ModifierOp.PercentAdd, value: 18 },
    ],
  },
  41: {
    id: 41,
    name: 'Frostfire Warbow',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.MainHand,
    description: 'Twin-stringed recurve bow tempered in glacial ice and volcanic embers.',
    icon: 'Crosshair',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.AttackPower, op: ModifierOp.Flat, value: 28 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 14 },
      { stat: StatType.MoveSpeed, op: ModifierOp.PercentAdd, value: 10 },
    ],
  },
  42: {
    id: 42,
    name: 'Netherbane Grimoire',
    rarity: ItemRarity.Epic,
    slot: EquipSlot.OffHand,
    description: 'Bound in shadow-drake hide, amplifying both elemental and necrotic spellcraft.',
    icon: 'BookOpen',
    maxStack: 1,
    equipModifiers: [
      { stat: StatType.SpellPower, op: ModifierOp.Flat, value: 26 },
      { stat: StatType.MaxMana, op: ModifierOp.Flat, value: 55 },
      { stat: StatType.CritChance, op: ModifierOp.Flat, value: 10 },
    ],
  },
};

export const defaultItemDefTable = new ItemDefTable();
for (const item of Object.values(ITEM_REGISTRY)) {
  defaultItemDefTable.Register(item);
}

export function getItemDef(id: number): ItemDef | undefined {
  return defaultItemDefTable.Get(id);
}

export function getScaledItemModifiers(
  defOrStack: ItemDef | ItemStack | null | undefined,
  upgradeLevelOverride?: number
): StatModifier[] {
  if (!defOrStack) return [];
  const isItemDef = 'equipModifiers' in defOrStack || 'name' in defOrStack;
  const def = isItemDef
    ? (defOrStack as ItemDef)
    : getItemDef((defOrStack as ItemStack).itemDefId);
  if (!def || !def.equipModifiers) return [];
  const upgradeLevel =
    upgradeLevelOverride !== undefined
      ? upgradeLevelOverride
      : !isItemDef
      ? (defOrStack as ItemStack).upgradeLevel || 0
      : 0;
  return def.equipModifiers.map((mod) => {
    let val = mod.value;
    for (let u = 0; u < upgradeLevel; u++) {
      val = Math.round(val * 1.15 + 2);
    }
    return { ...mod, value: val };
  });
}

export function createItemStack(itemDefId: number, count = 1, upgradeLevel = 0): ItemStack {
  return {
    instanceId: Math.random().toString(36).substring(2, 9),
    itemDefId,
    defId: itemDefId,
    count,
    upgradeLevel: upgradeLevel > 0 ? upgradeLevel : undefined,
  };
}

export function getRarityColor(rarity: ItemRarity = ItemRarity.Common): string {
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

export function getRarityBadgeColor(rarity: ItemRarity = ItemRarity.Common): string {
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
      return 'bg-amber-900/80 text-amber-300 border border-amber-600 font-bold';
  }
}

export function getRarityName(rarity: ItemRarity = ItemRarity.Common): string {
  switch (rarity) {
    case ItemRarity.Common:
      return 'Common';
    case ItemRarity.Uncommon:
      return 'Magic';
    case ItemRarity.Rare:
      return 'Rare';
    case ItemRarity.Epic:
      return 'Epic';
    case ItemRarity.Legendary:
      return 'Legendary';
  }
}
