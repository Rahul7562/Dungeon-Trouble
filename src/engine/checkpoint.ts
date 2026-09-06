import {
  CharacterClass,
  ZoneType,
  EquipmentState,
  ItemStack,
  PlayerStats,
  SavedGameState,
} from './types';

const SAVE_STORAGE_KEY = 'dungeon_trouble_save_v2';
const LEGACY_STORAGE_KEY = 'dungeon_trouble_checkpoint_v1';
const PLAYER_NAME_KEY = 'dungeon_trouble_player_name';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();

function getStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {
    // Storage access restricted or unavailable
  }
  return memoryStorage;
}

export function getLastPlayerName(): string {
  try {
    const storage = getStorage();
    const name = storage?.getItem(PLAYER_NAME_KEY);
    return name?.trim() || 'Valerius';
  } catch {
    return 'Valerius';
  }
}

export function setLastPlayerName(name: string): void {
  try {
    const storage = getStorage();
    const trimmed = name.trim() || 'Valerius';
    storage?.setItem(PLAYER_NAME_KEY, trimmed);
  } catch (err) {
    console.error('Failed to set player name:', err);
  }
}

export function saveGameState(state: {
  playerName: string;
  selectedClass: CharacterClass;
  currentZone: ZoneType;
  currentFloor: number;
  highestFloorUnlocked: number;
  clearedFloors: number[];
  playerX: number;
  playerY: number;
  playerStats: PlayerStats;
  equipment: EquipmentState;
  inventory: (ItemStack | null)[];
  storage: (ItemStack | null)[];
  unallocatedStatPoints: number;
}): void {
  try {
    const storage = getStorage();
    if (!storage) return;

    const data: SavedGameState = {
      version: 2,
      playerName: state.playerName || 'Valerius',
      selectedClass: state.selectedClass || 'swordsman',
      currentZone: state.currentZone || 'town',
      currentFloor: Math.max(1, Math.min(10, state.currentFloor || 1)),
      highestFloorUnlocked: Math.max(1, Math.min(10, state.highestFloorUnlocked || 1)),
      clearedFloors: state.clearedFloors || [],
      player: {
        x: state.playerX,
        y: state.playerY,
      },
      playerStats: {
        attributes: { ...state.playerStats.attributes },
        calculated: { ...state.playerStats.calculated },
        health: state.playerStats.health,
        mana: state.playerStats.mana,
        level: state.playerStats.level,
        xp: state.playerStats.xp,
        xpToNextLevel: state.playerStats.xpToNextLevel,
        gold: state.playerStats.gold,
      },
      equipment: { ...state.equipment },
      inventory: state.inventory.map((slot) => (slot ? { ...slot } : null)),
      storage: (state.storage || []).map((slot) => (slot ? { ...slot } : null)),
      unallocatedStatPoints: state.unallocatedStatPoints,
      savedAt: new Date().toISOString(),
    };

    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    setLastPlayerName(data.playerName);
  } catch (err) {
    console.error('Failed to save game state:', err);
  }
}

export function loadGameState(): SavedGameState | null {
  try {
    const storage = getStorage();
    if (!storage) return null;

    const raw = storage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedGameState;
      if (parsed && parsed.version === 2) {
        return parsed;
      }
    }

    // Fallback migration from legacy v1 checkpoint if available
    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const leg = JSON.parse(legacyRaw);
      if (leg && leg.currentFloor) {
        return {
          version: 2,
          playerName: getLastPlayerName(),
          selectedClass: 'swordsman',
          currentZone: 'dungeon',
          currentFloor: leg.currentFloor,
          highestFloorUnlocked: leg.currentFloor,
          clearedFloors: [],
          player: { x: 500, y: 500 },
          playerStats: leg.playerStats,
          equipment: leg.equipment,
          inventory: leg.inventory,
          storage: new Array(24).fill(null),
          unallocatedStatPoints: leg.unallocatedStatPoints || 0,
          savedAt: leg.savedAt || new Date().toISOString(),
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Failed to load game state:', err);
    return null;
  }
}

export function hasSavedGame(): boolean {
  return loadGameState() !== null;
}

export function clearSaveGame(): void {
  try {
    const storage = getStorage();
    storage?.removeItem(SAVE_STORAGE_KEY);
    storage?.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear save state:', err);
  }
}

// Backwards compatibility aliases for existing code/tests
export const saveFloorCheckpoint = (
  floor: number,
  playerStats: PlayerStats,
  equipment: EquipmentState,
  inventory: (ItemStack | null)[],
  unallocatedStatPoints: number
) => {
  const existing = loadGameState();
  saveGameState({
    playerName: existing?.playerName || getLastPlayerName(),
    selectedClass: existing?.selectedClass || 'swordsman',
    currentZone: 'dungeon',
    currentFloor: floor,
    highestFloorUnlocked: Math.max(floor, existing?.highestFloorUnlocked || floor),
    clearedFloors: existing?.clearedFloors || [],
    playerX: 0,
    playerY: 0,
    playerStats,
    equipment,
    inventory,
    storage: existing?.storage || new Array(24).fill(null),
    unallocatedStatPoints,
  });
};

export const loadFloorCheckpoint = loadGameState;
export const hasSavedCheckpoint = hasSavedGame;
export const clearCheckpoint = clearSaveGame;
