import {
  AttributeType,
  EquipmentState,
  ItemStack,
  PlayerStats,
  StatType,
} from './types';

export interface SavedCheckpoint {
  version: number;
  currentFloor: number;
  playerStats: {
    attributes: Record<AttributeType, number>;
    calculated: Record<StatType, number>;
    health: number;
    mana: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    gold: number;
  };
  equipment: EquipmentState;
  inventory: (ItemStack | null)[];
  unallocatedStatPoints: number;
  savedAt: string;
}

const CHECKPOINT_STORAGE_KEY = 'dungeon_trouble_checkpoint_v1';

export function saveFloorCheckpoint(
  floor: number,
  playerStats: PlayerStats,
  equipment: EquipmentState,
  inventory: (ItemStack | null)[],
  unallocatedStatPoints: number
): void {
  try {
    const data: SavedCheckpoint = {
      version: 1,
      currentFloor: floor,
      playerStats: {
        attributes: { ...playerStats.attributes },
        calculated: { ...playerStats.calculated },
        health: playerStats.health,
        mana: playerStats.mana,
        level: playerStats.level,
        xp: playerStats.xp,
        xpToNextLevel: playerStats.xpToNextLevel,
        gold: playerStats.gold,
      },
      equipment: { ...equipment },
      inventory: inventory.map((slot) => (slot ? { ...slot } : null)),
      unallocatedStatPoints,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save floor checkpoint:', err);
  }
}

export function loadFloorCheckpoint(): SavedCheckpoint | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCheckpoint;
    if (parsed && parsed.version === 1 && parsed.currentFloor >= 1) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to load floor checkpoint:', err);
    return null;
  }
}

export function hasSavedCheckpoint(): boolean {
  return loadFloorCheckpoint() !== null;
}

export function clearCheckpoint(): void {
  try {
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear checkpoint:', err);
  }
}
