import { ItemStack } from './types';
import { createItemStack } from './items';

export interface LootEntry {
  itemDefId: number;
  minCount: number;
  maxCount: number;
  weight: number;
  guaranteed?: boolean;
}

export interface LootTableDef {
  id: number;
  name: string;
  rolls: number;
  entries: LootEntry[];
}

export const LOOT_TABLES: Record<string, LootTableDef> = {
  trash: {
    id: 1,
    name: 'Dungeon Minion Drop',
    rolls: 1,
    entries: [
      { itemDefId: 10, minCount: 1, maxCount: 2, weight: 40 }, // Health potion
      { itemDefId: 11, minCount: 1, maxCount: 1, weight: 30 }, // Mana flask
      { itemDefId: 1, minCount: 1, maxCount: 1, weight: 20 },  // Rusty sword
      { itemDefId: 2, minCount: 1, maxCount: 1, weight: 10 },  // Reinforced armor
    ],
  },
  elite: {
    id: 2,
    name: 'Elite Champion Drop',
    rolls: 2,
    entries: [
      { itemDefId: 2, minCount: 1, maxCount: 1, weight: 25 },
      { itemDefId: 3, minCount: 1, maxCount: 1, weight: 25 }, // Shadowrunner Boots
      { itemDefId: 7, minCount: 1, maxCount: 1, weight: 20 }, // Shield
      { itemDefId: 8, minCount: 1, maxCount: 1, weight: 15 }, // Ring
      { itemDefId: 10, minCount: 2, maxCount: 3, weight: 30 },
    ],
  },
  boss: {
    id: 3,
    name: 'Dungeon Lord Cache',
    rolls: 3,
    entries: [
      { itemDefId: 4, minCount: 1, maxCount: 1, weight: 25 }, // Spellweaver Crown
      { itemDefId: 5, minCount: 1, maxCount: 1, weight: 25 }, // Dragon Greaves
      { itemDefId: 6, minCount: 1, maxCount: 1, weight: 15 }, // Ruin Blade
      { itemDefId: 9, minCount: 1, maxCount: 1, weight: 20 }, // Vitality Amulet
      { itemDefId: 8, minCount: 1, maxCount: 1, weight: 25 }, // Ring
    ],
  },
  chest: {
    id: 4,
    name: 'Ancient Treasure Chest',
    rolls: 2,
    entries: [
      { itemDefId: 3, minCount: 1, maxCount: 1, weight: 30 },
      { itemDefId: 7, minCount: 1, maxCount: 1, weight: 25 },
      { itemDefId: 8, minCount: 1, maxCount: 1, weight: 20 },
      { itemDefId: 9, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 10, minCount: 2, maxCount: 4, weight: 40 },
      { itemDefId: 11, minCount: 2, maxCount: 3, weight: 35 },
    ],
  },
};

export function rollLoot(tableKey: string): ItemStack[] {
  const table = LOOT_TABLES[tableKey] || LOOT_TABLES.trash;
  const drops: ItemStack[] = [];

  // Guaranteed entries
  for (const entry of table.entries) {
    if (entry.guaranteed) {
      const count = Math.floor(Math.random() * (entry.maxCount - entry.minCount + 1)) + entry.minCount;
      drops.push(createItemStack(entry.itemDefId, count));
    }
  }

  // Weighted random rolls
  const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return drops;

  for (let r = 0; r < table.rolls; r++) {
    // 65% chance of rolling an item on each roll
    if (Math.random() > 0.65) continue;

    let pick = Math.random() * totalWeight;
    for (const entry of table.entries) {
      if (pick <= entry.weight) {
        const count = Math.floor(Math.random() * (entry.maxCount - entry.minCount + 1)) + entry.minCount;
        drops.push(createItemStack(entry.itemDefId, count));
        break;
      }
      pick -= entry.weight;
    }
  }

  return drops;
}
