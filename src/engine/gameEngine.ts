import {
  TileType,
  AttributeType,
  StatType,
  EquipmentState,
  ItemStack,
  EnemyEntity,
  Projectile,
  LootDropEntity,
  Particle,
  FloatingCombatText,
  CombatLogEntry,
  DamageSchool,
  EquipSlot,
  PlayerStats,
  BossTelegraph,
  StatusEffectInstance,
  CharacterClass,
  ZoneType,
  NPCEntity,
  SummonEntity,
  AbilityDef,
} from './types';
import { TileMap, generateDungeonLevel, TileFlags, DungeonProp } from './world';
import {
  generateTownLevel,
  GeneratedTown,
  computeDaylightState,
  isPlayerInsideBuilding,
  TOWN_TILE_FLAG_TREE,
  TOWN_TILE_FLAG_ROAD,
  TOWN_TILE_FLAG_INTERIOR_OAK,
} from './town';
import { SpatialGrid } from './spatialGrid';
import { CLASS_DEFINITIONS, getClassDefinition } from './classes';
import { computeTotalStats, getStatName } from './stats';
import { resolveDamagePipeline, DAMAGE_FLAGS, getSchoolColor } from './combat';
import { rollLoot } from './loot';
import { getItemDef, createItemStack } from './items';
import { PLAYER_ABILITIES } from './abilities';
import { sound, computeIsometricStereoPan } from './audio';
import {
  saveGameState,
  loadGameState,
  hasSavedGame,
  getLastPlayerName,
  setLastPlayerName,
  saveFloorCheckpoint,
  loadFloorCheckpoint,
} from './checkpoint';

export interface GameEngineState {
  playerName: string;
  selectedClass: CharacterClass;
  currentZone: ZoneType;
  currentFloor: number;
  highestFloorUnlocked: number;
  clearedFloors: number[];
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facingAngle: number;
    isAttacking: boolean;
    attackAnimTimer: number;
    hitFlashTimer?: number;
    statusEffects: StatusEffectInstance[];
  };
  playerStats: PlayerStats;
  equipment: EquipmentState;
  inventory: (ItemStack | null)[];
  storage: (ItemStack | null)[];
  enemies: EnemyEntity[];
  projectiles: Projectile[];
  lootDrops: LootDropEntity[];
  particles: Particle[];
  floatingTexts: FloatingCombatText[];
  combatLogs: CombatLogEntry[];
  abilityCooldowns: Record<number, number>; // abilityId -> seconds left
  telegraphs: BossTelegraph[];
  screenShake: number;
  dungeon: ReturnType<typeof generateDungeonLevel>;
  townLevel: GeneratedTown;
  activeNPC: NPCEntity | null;
  summons: SummonEntity[];
  isGameOver: boolean;
  isVictory: boolean;
  unallocatedStatPoints: number;
  floorCleared: boolean;
  worldTimeHours: number;
}

export const FLOOR_BOSS_DEFS: Record<
  number,
  { name: string; health: number; attackPower: number; armor: number; color: string; size: number; xp: number }
> = {
  1: { name: 'Groth the Bone-Crusher', health: 420, attackPower: 26, armor: 20, color: '#f87171', size: 24, xp: 180 },
  2: { name: 'Skeletal Champion Vesper', health: 560, attackPower: 32, armor: 26, color: '#fb923c', size: 26, xp: 240 },
  3: { name: 'Mortis the Undying (Crypt Lord)', health: 750, attackPower: 40, armor: 32, color: '#c084fc', size: 28, xp: 350 },
  4: { name: 'Catacomb Defiler Kaelen', health: 950, attackPower: 48, armor: 38, color: '#34d399', size: 28, xp: 450 },
  5: { name: 'Sunken Dreadnought Azgora', health: 1200, attackPower: 56, armor: 46, color: '#38bdf8', size: 30, xp: 580 },
  6: { name: 'Malakor the Void Weaver', health: 1550, attackPower: 66, armor: 54, color: '#a855f7', size: 32, xp: 750 },
  7: { name: 'Magma Brute Volkan', health: 1900, attackPower: 78, armor: 62, color: '#f97316', size: 32, xp: 950 },
  8: { name: 'Abyssal Pyroclast Thalor', health: 2300, attackPower: 90, armor: 70, color: '#ef4444', size: 34, xp: 1200 },
  9: { name: 'Shadow Archon Gorgoroth', health: 2800, attackPower: 105, armor: 80, color: '#818cf8', size: 34, xp: 1500 },
  10: { name: 'Ignis Rex - Supreme Lord of the Cataclysm', health: 3800, attackPower: 125, armor: 95, color: '#dc2626', size: 36, xp: 2500 },
};

export class GameEngine {
  public state!: GameEngineState;
  public isPaused: boolean = false;
  public onInteract?: () => void;
  public onInteractPortal?: () => void;
  private keyState: Record<string, boolean> = {};
  public mousePos = { x: 0, y: 0 };
  public worldMousePos = { x: 0, y: 0 };
  public camera = { x: 0, y: 0 };
  private nextEntityId = 1;

  // Spatial Partitioning Grids for O(1) simulation & viewport culling
  public readonly enemySpatialGrid = new SpatialGrid<EnemyEntity>(6144, 6144, 256);
  public readonly npcSpatialGrid = new SpatialGrid<NPCEntity>(6144, 6144, 256);
  public readonly lootSpatialGrid = new SpatialGrid<LootDropEntity>(6144, 6144, 256);
  public readonly dungeonPropSpatialGrid = new SpatialGrid<DungeonProp>(6144, 6144, 256);
  private readonly nearbyEnemiesBuf: EnemyEntity[] = [];
  private readonly projHitEnemiesBuf: EnemyEntity[] = [];
  private readonly visibleEnemiesBuf: EnemyEntity[] = [];
  private readonly visibleNpcsBuf: NPCEntity[] = [];
  private readonly visibleLootBuf: LootDropEntity[] = [];
  private readonly visiblePropsBuf: DungeonProp[] = [];

  /**
   * Queries the Spatial Partitioning Grids for only the game objects overlapping the active world-space viewport box.
   */
  public getVisibleEntities(minX: number, minY: number, maxX: number, maxY: number) {
    const isTown = this.state.currentZone === 'town';
    if (isTown) {
      if (this.isPaused) {
        this.npcSpatialGrid.clear();
        for (const npc of this.state.townLevel.npcs) {
          this.npcSpatialGrid.insert(npc, npc.x, npc.y, 15);
        }
      }
      this.npcSpatialGrid.queryRect(minX, minY, maxX, maxY, this.visibleNpcsBuf);
      this.visibleEnemiesBuf.length = 0;
      this.visibleLootBuf.length = 0;
      return {
        enemies: this.visibleEnemiesBuf,
        npcs: this.visibleNpcsBuf,
        lootDrops: this.visibleLootBuf,
        props: this.state.townLevel.props,
      };
    } else {
      if (this.isPaused) {
        this.enemySpatialGrid.clear();
        for (const e of this.state.enemies) {
          if (e.health > 0) this.enemySpatialGrid.insert(e, e.x, e.y, e.size);
        }
        this.lootSpatialGrid.clear();
        for (const d of this.state.lootDrops) {
          this.lootSpatialGrid.insert(d, d.x, d.y, 16);
        }
        if (this.state.dungeon?.props) {
          this.dungeonPropSpatialGrid.clear();
          for (const p of this.state.dungeon.props) {
            this.dungeonPropSpatialGrid.insert(p, p.x, p.y, 24);
          }
        }
      }
      this.enemySpatialGrid.queryRect(minX, minY, maxX, maxY, this.visibleEnemiesBuf);
      this.lootSpatialGrid.queryRect(minX, minY, maxX, maxY, this.visibleLootBuf);
      this.dungeonPropSpatialGrid.queryRect(minX, minY, maxX, maxY, this.visiblePropsBuf);
      this.visibleNpcsBuf.length = 0;
      return {
        enemies: this.visibleEnemiesBuf,
        npcs: this.visibleNpcsBuf,
        lootDrops: this.visibleLootBuf,
        props: this.visiblePropsBuf,
      };
    }
  }

  constructor() {
    this.isPaused = true;
    if (hasSavedGame() && this.loadSavedGame()) {
      // Successfully loaded existing saved game profile
    } else {
      // Clean default initialization for preview WITHOUT overwriting storage with a phantom Swordsman
      this.state = this.initializeNewGame('swordsman', getLastPlayerName(), true, 1, false);
    }
  }

  public initializeNewGame(
    characterClass: CharacterClass | number = 'swordsman',
    playerName: string = getLastPlayerName(),
    startInTown: boolean = true,
    startFloor: number = 1,
    shouldAutoSave: boolean = true
  ): GameEngineState {
    // Gracefully handle legacy numeric startFloor parameter
    let selectedClassKey: CharacterClass = 'swordsman';
    let targetFloor = startFloor;

    if (typeof characterClass === 'number') {
      targetFloor = characterClass;
      selectedClassKey = 'swordsman';
    } else if (typeof characterClass === 'string' && CLASS_DEFINITIONS[characterClass]) {
      selectedClassKey = characterClass;
    }

    const classDef = getClassDefinition(selectedClassKey);
    const resolvedPlayerName = (playerName && playerName.trim()) || 'Valerius';
    setLastPlayerName(resolvedPlayerName);

    const townLevel = generateTownLevel();
    const dungeon = generateDungeonLevel(targetFloor);

    const initialAttributes = { ...classDef.baseAttributes };
    const initialEquipment = classDef.getStartingEquipment();
    const initialInventory = classDef.getStartingInventory();
    const initialStorage = new Array(24).fill(null);

    const calculatedStats = computeTotalStats(initialAttributes, initialEquipment);

    const playerStats: PlayerStats = {
      attributes: initialAttributes,
      calculated: calculatedStats,
      health: calculatedStats[StatType.MaxHealth],
      mana: calculatedStats[StatType.MaxMana],
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      gold: 100,
    };

    const initialSpawn = startInTown ? townLevel.playerSpawn : dungeon.playerSpawn;

    const state: GameEngineState = {
      playerName: resolvedPlayerName,
      selectedClass: selectedClassKey,
      currentZone: startInTown ? 'town' : 'dungeon',
      currentFloor: targetFloor,
      highestFloorUnlocked: 1,
      clearedFloors: [],
      player: {
        x: initialSpawn.x,
        y: initialSpawn.y,
        vx: 0,
        vy: 0,
        facingAngle: 0,
        isAttacking: false,
        attackAnimTimer: 0,
        statusEffects: [],
      },
      playerStats,
      equipment: initialEquipment,
      inventory: initialInventory,
      storage: initialStorage,
      enemies: [],
      projectiles: [],
      lootDrops: [],
      particles: [],
      floatingTexts: [],
      combatLogs: [
        {
          id: `init-${this.nextEntityId++}`,
          text: startInTown
            ? `Welcome to Town-1, ${resolvedPlayerName}! Explore the village houses, meet the townsfolk, and prepare.`
            : `Entered Dungeon Chamber - Floor ${targetFloor}. Slay foes and seek the portal.`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      abilityCooldowns: {},
      telegraphs: [],
      screenShake: 0,
      dungeon,
      townLevel,
      activeNPC: null,
      summons: [],
      isGameOver: false,
      isVictory: false,
      unallocatedStatPoints: 0,
      floorCleared: false,
      worldTimeHours: 9.5,
    };

    this.camera.x = ((initialSpawn.x - initialSpawn.y) / 64) * 32;
    this.camera.y = ((initialSpawn.x + initialSpawn.y) / 64) * 16;

    if (!startInTown) {
      this.spawnFloorEnemies(state, dungeon, targetFloor);
    }

    this.state = state;
    if (shouldAutoSave) {
      this.autoSave();
    }
    return state;
  }

  public autoSave(): void {
    const state = this.state;
    if (!state) return;
    saveGameState({
      playerName: state.playerName,
      selectedClass: state.selectedClass,
      currentZone: state.currentZone,
      currentFloor: state.currentFloor,
      highestFloorUnlocked: state.highestFloorUnlocked,
      clearedFloors: state.clearedFloors,
      playerX: state.player.x,
      playerY: state.player.y,
      playerStats: state.playerStats,
      equipment: state.equipment,
      inventory: state.inventory,
      storage: state.storage,
      unallocatedStatPoints: state.unallocatedStatPoints,
    });
  }

  public healPlayerFull(): void {
    const maxHp = this.state.playerStats.calculated[StatType.MaxHealth];
    const maxMp = this.state.playerStats.calculated[StatType.MaxMana];
    this.state.playerStats.health = maxHp;
    this.state.playerStats.mana = maxMp;
    this.state.player.statusEffects = [];
    this.addCombatLog('Sister Althea has blessed you with full Health and Mana restoration!', 'heal');
    this.autoSave();
  }

  public upgradeEquipmentItem(slot: EquipSlot): void {
    const item = this.state.equipment[slot];
    if (!item) return;
    const def = getItemDef(item.itemDefId);
    if (!def || !def.equipModifiers) return;

    item.upgradeLevel = (item.upgradeLevel || 0) + 1;
    this.recalculatePlayerStats();
    this.addCombatLog(`Torvald tempered your ${def.name} to +${item.upgradeLevel}! All stats enhanced!`, 'system');
    this.autoSave();
  }

  public transitionToZone(zone: ZoneType, floor: number = 1): void {
    const state = this.state;
    state.currentZone = zone;
    state.player.statusEffects = [];
    state.telegraphs = [];
    state.projectiles = [];
    state.lootDrops = [];
    state.particles = [];
    state.floatingTexts = [];
    state.screenShake = 0;

    sound.setAmbientZone(zone);
    if (zone === 'town') {
      state.enemies = [];
      state.summons = [];
      state.player.x = state.townLevel.playerSpawn.x;
      state.player.y = state.townLevel.playerSpawn.y;
      this.camera.x = ((state.player.x - state.player.y) / 64) * 32;
      this.camera.y = ((state.player.x + state.player.y) / 64) * 16;
      this.addCombatLog(`Entered Town-1 Sanctuary. You are in safe territory.`, 'system');
    } else {
      state.currentFloor = Math.max(1, Math.min(10, floor));
      state.dungeon = generateDungeonLevel(state.currentFloor);
      state.player.x = state.dungeon.playerSpawn.x;
      state.player.y = state.dungeon.playerSpawn.y;
      this.camera.x = ((state.player.x - state.player.y) / 64) * 32;
      this.camera.y = ((state.player.x + state.player.y) / 64) * 16;
      state.floorCleared = false;
      this.spawnFloorEnemies(state, state.dungeon, state.currentFloor);
      const themeName = state.dungeon.theme?.name || 'Dungeon Ruin';
      this.addCombatLog(`Delved into Floor ${state.currentFloor}: ${themeName}!`, 'system');
    }
    this.autoSave();
  }

  public loadSavedGame(): boolean {
    const save = loadGameState();
    if (!save) return false;

    const townLevel = generateTownLevel();
    const dungeon = generateDungeonLevel(save.currentFloor);
    const calculatedStats = computeTotalStats(save.playerStats.attributes, save.equipment);

    const playerStats: PlayerStats = {
      attributes: { ...save.playerStats.attributes },
      calculated: calculatedStats,
      health: Math.min(calculatedStats[StatType.MaxHealth], Math.max(20, save.playerStats.health)),
      mana: Math.min(calculatedStats[StatType.MaxMana], save.playerStats.mana),
      level: save.playerStats.level,
      xp: save.playerStats.xp,
      xpToNextLevel: save.playerStats.xpToNextLevel,
      gold: save.playerStats.gold,
    };

    const isTown = save.currentZone === 'town';
    const initialSpawn = isTown ? townLevel.playerSpawn : dungeon.playerSpawn;

    this.state = {
      playerName: save.playerName || 'Valerius',
      selectedClass: save.selectedClass || 'swordsman',
      currentZone: save.currentZone || 'town',
      currentFloor: save.currentFloor || 1,
      highestFloorUnlocked: save.highestFloorUnlocked || 1,
      clearedFloors: save.clearedFloors || [],
      player: {
        x: isTown ? (save.player?.x || initialSpawn.x) : dungeon.playerSpawn.x,
        y: isTown ? (save.player?.y || initialSpawn.y) : dungeon.playerSpawn.y,
        vx: 0,
        vy: 0,
        facingAngle: 0,
        isAttacking: false,
        attackAnimTimer: 0,
        statusEffects: [],
      },
      playerStats,
      equipment: { ...save.equipment },
      inventory: save.inventory.map((slot) => (slot ? { ...slot } : null)),
      storage: (save.storage || new Array(24).fill(null)).map((slot) => (slot ? { ...slot } : null)),
      enemies: [],
      projectiles: [],
      lootDrops: [],
      particles: [],
      floatingTexts: [],
      combatLogs: [
        {
          id: `load-${this.nextEntityId++}`,
          text: `Loaded profile: ${save.playerName} (${save.selectedClass.toUpperCase()} Lv.${playerStats.level}).`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      abilityCooldowns: {},
      telegraphs: [],
      screenShake: 0,
      dungeon,
      townLevel,
      activeNPC: null,
      summons: [],
      isGameOver: false,
      isVictory: false,
      unallocatedStatPoints: save.unallocatedStatPoints || 0,
      floorCleared: false,
      worldTimeHours: 9.5,
    };

    // Ensure saved town position is walkable on the expanded 48x48 Town-1 map
    if (isTown) {
      const pt = townLevel.map.worldToTile(this.state.player.x, this.state.player.y);
      const tileAtSaved = townLevel.map.get(pt.x, pt.y);
      if (tileAtSaved === TileType.Wall) {
        this.state.player.x = townLevel.playerSpawn.x;
        this.state.player.y = townLevel.playerSpawn.y;
      }
    }

    this.camera.x = ((this.state.player.x - this.state.player.y) / 64) * 32;
    this.camera.y = ((this.state.player.x + this.state.player.y) / 64) * 16;

    if (!isTown) {
      this.spawnFloorEnemies(this.state, dungeon, save.currentFloor);
    }

    this.recalculatePlayerStats();
    return true;
  }

  public loadCheckpointGame(): boolean {
    return this.loadSavedGame();
  }

  private spawnFloorEnemies(state: GameEngineState, dungeon: ReturnType<typeof generateDungeonLevel>, floor: number) {
    const enemies: EnemyEntity[] = [];
    const eliteModifiers: Array<'Vampiric' | 'Molten' | 'Frozen' | 'Arcane' | 'Berserker'> = [
      'Vampiric',
      'Molten',
      'Frozen',
      'Arcane',
      'Berserker',
    ];

    // Spawn regular and elite enemies in intermediate rooms
    for (let r = 1; r < dungeon.rooms.length - 1; r++) {
      const room = dungeon.rooms[r];
      const count = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < count; i++) {
        const tx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
        const ty = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
        const spawn = dungeon.map.tileToWorldCenter(tx, ty);

        const roll = Math.random();
        const isElite = floor >= 2 && i === 0 && Math.random() < 0.28;
        const eliteMod = isElite ? eliteModifiers[(r + floor) % eliteModifiers.length] : undefined;
        const hpMult = isElite ? 1.55 : 1.0;
        const dmgMult = isElite ? 1.25 : 1.0;
        const xpMult = isElite ? 2.2 : 1.0;
        const sizeBonus = isElite ? 3 : 0;

        if (floor >= 3 && roll > 0.82) {
          const baseHp = Math.round((130 + floor * 28) * hpMult);
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'abyssal_brute',
            name: isElite ? `${eliteMod} Abyssal Juggernaut` : 'Abyssal Brute',
            x: spawn.x,
            y: spawn.y,
            spawnX: spawn.x,
            spawnY: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: baseHp,
            maxHealth: baseHp,
            attackPower: Math.round((20 + floor * 5) * dmgMult),
            armor: 18 + floor * 2,
            moveSpeed: 68,
            attackRange: 55,
            attackCooldown: 1.9,
            attackTimer: Math.random() * 1.2,
            xpReward: Math.round((42 + floor * 6) * xpMult),
            color: '#dc2626',
            size: 19 + sizeBonus,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
            isElite,
            eliteModifier: eliteMod,
          });
        } else if (floor >= 2 && roll > 0.66) {
          const baseHp = Math.round((90 + floor * 20) * hpMult);
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'necromancer',
            name: isElite ? `${eliteMod} Crypt Lich` : 'Crypt Necromancer',
            x: spawn.x,
            y: spawn.y,
            spawnX: spawn.x,
            spawnY: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: baseHp,
            maxHealth: baseHp,
            attackPower: Math.round((16 + floor * 4) * dmgMult),
            armor: 8 + floor,
            moveSpeed: 62,
            attackRange: 240,
            attackCooldown: 2.2,
            attackTimer: Math.random() * 1.5,
            summonTimer: 9.0,
            xpReward: Math.round((35 + floor * 5) * xpMult),
            color: '#7e22ce',
            size: 16 + sizeBonus,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
            isElite,
            eliteModifier: eliteMod,
          });
        } else if (floor >= 2 && roll > 0.48) {
          const baseHp = Math.round((68 + floor * 16) * hpMult);
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'shadow_stalker',
            name: isElite ? `${eliteMod} Nightblade Stalker` : 'Shadow Stalker',
            x: spawn.x,
            y: spawn.y,
            spawnX: spawn.x,
            spawnY: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: baseHp,
            maxHealth: baseHp,
            attackPower: Math.round((16 + floor * 4) * dmgMult),
            armor: 7 + floor,
            moveSpeed: 122,
            attackRange: 44,
            attackCooldown: 0.95,
            attackTimer: Math.random() * 0.8,
            xpReward: Math.round((28 + floor * 4) * xpMult),
            color: '#6366f1',
            size: 14 + sizeBonus,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
            isElite,
            eliteModifier: eliteMod,
          });
        } else if (roll > 0.28) {
          const baseHp = Math.round((60 + floor * 15) * hpMult);
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'goblin_archer',
            name: isElite ? `${eliteMod} Deadeye Marksman` : 'Sentry Archer',
            x: spawn.x,
            y: spawn.y,
            spawnX: spawn.x,
            spawnY: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: baseHp,
            maxHealth: baseHp,
            attackPower: Math.round((12 + floor * 3) * dmgMult),
            armor: 5 + floor,
            moveSpeed: 88,
            attackRange: 210,
            attackCooldown: 1.55,
            attackTimer: Math.random() * 1.2,
            xpReward: Math.round((25 + floor * 3) * xpMult),
            color: '#15803d',
            size: 14 + sizeBonus,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
            isElite,
            eliteModifier: eliteMod,
          });
        } else {
          const baseHp = Math.round((80 + floor * 18) * hpMult);
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'skeleton_warrior',
            name: isElite ? `${eliteMod} Bone Vanguard` : 'Skeleton Marauder',
            x: spawn.x,
            y: spawn.y,
            spawnX: spawn.x,
            spawnY: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: baseHp,
            maxHealth: baseHp,
            attackPower: Math.round((14 + floor * 3) * dmgMult),
            armor: 12 + floor,
            moveSpeed: 95,
            attackRange: 46,
            attackCooldown: 1.2,
            attackTimer: Math.random() * 1.0,
            xpReward: Math.round((20 + floor * 3) * xpMult),
            color: '#e2e8f0',
            size: 15 + sizeBonus,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
            isElite,
            eliteModifier: eliteMod,
          });
        }
      }
    }

    // Spawn Boss in the final room
    const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];
    const bossSpawn = dungeon.map.tileToWorldCenter(lastRoom.centerX, lastRoom.centerY - 2);
    const bossDef = FLOOR_BOSS_DEFS[floor] || {
      name: `Floor ${floor} Overseer`,
      health: 350 + floor * 180,
      attackPower: 26 + floor * 9,
      armor: 22 + floor * 5,
      color: '#dc2626',
      size: 26,
      xp: 140 + floor * 60,
    };

    enemies.push({
      id: `boss-${this.nextEntityId++}`,
      archetype: 'dungeon_lord',
      name: bossDef.name,
      x: bossSpawn.x,
      y: bossSpawn.y,
      spawnX: bossSpawn.x,
      spawnY: bossSpawn.y,
      z: 0,
      vx: 0,
      vy: 0,
      health: bossDef.health,
      maxHealth: bossDef.health,
      attackPower: bossDef.attackPower,
      armor: bossDef.armor,
      moveSpeed: 76,
      attackRange: 75,
      attackCooldown: 1.8,
      attackTimer: 0.5,
      xpReward: bossDef.xp,
      color: bossDef.color,
      size: bossDef.size,
      facingAngle: 0,
      statusEffects: [],
      isHitFlashTimer: 0,
      phase: 1,
      isEnraged: false,
      specialAttackTimer: 4.0,
      summonTimer: 7.0,
      novaTimer: 6.5,
    });

    state.enemies = enemies;
  }

  public canInteract(): boolean {
    const state = this.state;
    if (state.currentZone === 'town') {
      if (state.activeNPC) return true;
      const portalPos = state.townLevel.dungeonPortalPos;
      if (portalPos && Math.hypot(state.player.x - portalPos.x, state.player.y - portalPos.y) <= 90) {
        return true;
      }
    } else {
      if (state.floorCleared && state.dungeon?.exitTile) {
        const exitPos = state.dungeon.map.tileToWorldCenter(
          state.dungeon.exitTile.x,
          state.dungeon.exitTile.y
        );
        if (Math.hypot(state.player.x - exitPos.x, state.player.y - exitPos.y) <= 90) {
          return true;
        }
      }
    }
    return false;
  }

  public interact(): void {
    const state = this.state;
    if (state.currentZone === 'town') {
      if (state.activeNPC) {
        sound.playEquip();
        this.onInteract?.();
        return;
      }
      const portalPos = state.townLevel.dungeonPortalPos;
      if (portalPos && Math.hypot(state.player.x - portalPos.x, state.player.y - portalPos.y) <= 90) {
        sound.playPortal();
        this.onInteractPortal?.();
        return;
      }
    } else {
      if (state.floorCleared && state.dungeon?.exitTile) {
        const exitPos = state.dungeon.map.tileToWorldCenter(
          state.dungeon.exitTile.x,
          state.dungeon.exitTile.y
        );
        if (Math.hypot(state.player.x - exitPos.x, state.player.y - exitPos.y) <= 90) {
          if (state.currentFloor >= 10) {
            state.isVictory = true;
            this.addCombatLog('👑 YOU HAVE CONQUERED THE ABYSS! SUPREME VICTORY!', 'system');
          } else {
            sound.playPortal();
            this.advanceToNextFloor();
          }
          return;
        }
      }
    }
  }

  public handleKeyDown(key: string, code?: string) {
    if (this.isPaused || this.state.isGameOver || this.state.isVictory) return;
    const k = key.toLowerCase();
    this.keyState[k] = true;
    if (code) {
      this.keyState[code.toLowerCase()] = true;
    }

    if (k === 'e' || k === 'f' || code === 'KeyE' || code === 'KeyF') {
      if (this.canInteract()) {
        this.interact();
        return;
      }
      // If pressing 'e' and nothing to interact with, trigger Ability 3
      if (k === 'e' || code === 'KeyE') {
        this.triggerAbility(3);
        return;
      }
    }

    if (k === 'h' || k === 'z' || code === 'KeyH' || code === 'KeyZ') {
      this.useQuickPotion('health');
      return;
    }
    if (k === 'm' || k === 'x' || code === 'KeyM' || code === 'KeyX') {
      this.useQuickPotion('mana');
      return;
    }

    if (k === '1' || code === 'Digit1') {
      this.triggerAbility(1);
    } else if (k === '2' || k === 'q' || code === 'Digit2' || code === 'KeyQ') {
      this.triggerAbility(2);
    } else if (k === '3' || k === 'r' || code === 'Digit3' || code === 'KeyR') {
      this.triggerAbility(3);
    } else if (k === '4' || k === ' ' || code === 'Digit4' || code === 'Space') {
      this.triggerAbility(4);
    }
  }

  public useQuickPotion(type: 'health' | 'mana'): boolean {
    const inv = this.state.inventory;
    if (type === 'health') {
      const idx = inv.findIndex((s) => s && (s.itemDefId === 10 || s.itemDefId === 26 || s.itemDefId === 14));
      if (idx !== -1) {
        this.useItem(idx);
        return true;
      }
      this.addCombatLog('No Health Elixirs remaining in bag!', 'system');
      return false;
    } else {
      const idx = inv.findIndex((s) => s && (s.itemDefId === 11 || s.itemDefId === 27));
      if (idx !== -1) {
        this.useItem(idx);
        return true;
      }
      this.addCombatLog('No Mana Flasks remaining in bag!', 'system');
      return false;
    }
  }

  public handleKeyUp(key: string, code?: string) {
    const k = key.toLowerCase();
    delete this.keyState[k];
    if (code) {
      delete this.keyState[code.toLowerCase()];
    }
  }

  public clearInput() {
    this.keyState = {};
  }

  public isMoveActive(dir: 'up' | 'down' | 'left' | 'right'): boolean {
    if (this.isPaused) return false;
    switch (dir) {
      case 'up':
        return !!(this.keyState['w'] || this.keyState['arrowup'] || this.keyState['keyw']);
      case 'down':
        return !!(this.keyState['s'] || this.keyState['arrowdown'] || this.keyState['keys']);
      case 'left':
        return !!(this.keyState['a'] || this.keyState['arrowleft'] || this.keyState['keya']);
      case 'right':
        return !!(this.keyState['d'] || this.keyState['arrowright'] || this.keyState['keyd']);
    }
  }

  public triggerAbility(slotOrId: number) {
    const state = this.state;
    if (state.isGameOver || state.isVictory) return;

    const classDef = CLASS_DEFINITIONS[state.selectedClass || 'swordsman'];
    let ability =
      slotOrId >= 1 && slotOrId <= 4
        ? classDef?.abilities[slotOrId - 1]
        : classDef?.abilities.find((a) => a.id === slotOrId) ||
          PLAYER_ABILITIES.find((a) => a.id === slotOrId);

    if (!ability) return;
    const abilityId = ability.id;

    // Check cooldown
    if ((state.abilityCooldowns[abilityId] || 0) > 0) return;

    // Check mana
    if (state.playerStats.mana < ability.manaCost) {
      this.addCombatLog('Not enough mana!', 'system');
      return;
    }

    // Deduct mana
    state.playerStats.mana -= ability.manaCost;

    // Calculate Cooldown with CDR stat
    const cdr = state.playerStats.calculated[StatType.CooldownReduction] || 0;
    const cooldownSec =
      ability.cooldownSec ??
      (ability.cooldownTicks !== undefined ? ability.cooldownTicks / 30 : 1.0);
    const effectiveCooldown = cooldownSec * (1 - Math.min(60, cdr) / 100);
    state.abilityCooldowns[abilityId] = effectiveCooldown;

    const currentMap = state.currentZone === 'town' ? state.townLevel.map : state.dungeon.map;
    const px = state.player.x;
    const py = state.player.y;
    const aimAngle = state.player.facingAngle;

    // 1. Swordsman Abilities (101..104 or generic fallback 1)
    if (ability.id === 101 || ability.id === 1) {
      // Twin Slash: Melee frontal cleave in generous arc
      sound.playSwing();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.28;

      // Twin Cleave sweeping blade wave + directional sparks
      state.particles.push({
        x: px + Math.cos(aimAngle) * 26,
        y: py + Math.sin(aimAngle) * 26,
        vx: Math.cos(aimAngle) * 45,
        vy: Math.sin(aimAngle) * 45,
        color: '#fef08a',
        secondaryColor: '#f97316',
        size: 52,
        life: 0.24,
        maxLife: 0.24,
        kind: 'slash',
        angle: aimAngle,
      });

      const cleaveArc = 1.9; // ~110-degree frontal cleave
      const hitRadius = ability.range + 16;
      const pointBlank = 36;

      for (const enemy of state.enemies) {
        const dx = enemy.x - px;
        const dy = enemy.y - py;
        const dist = Math.hypot(dx, dy);

        if (dist <= pointBlank) {
          this.applyPlayerDamageToEnemy(enemy, ability);
          continue;
        }

        if (dist <= hitRadius + enemy.size) {
          const angleToEnemy = Math.atan2(dy, dx);
          const angleDiff = Math.abs(
            Math.atan2(Math.sin(angleToEnemy - aimAngle), Math.cos(angleToEnemy - aimAngle))
          );
          if (angleDiff <= cleaveArc / 2) {
            this.applyPlayerDamageToEnemy(enemy, ability);
          }
        }
      }
    } else if (ability.id === 102) {
      // Heavy Strike: Crushing blow + Stun
      sound.playHit(true);
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.35;
      state.screenShake = 5;

      state.particles.push({
        x: px + Math.cos(aimAngle) * 22,
        y: py + Math.sin(aimAngle) * 22,
        vx: 0,
        vy: 0,
        color: '#f59e0b',
        size: 75,
        life: 0.32,
        maxLife: 0.32,
        kind: 'shockwave',
      });

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - px, enemy.y - py);
        if (dist <= 75 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
          enemy.statusEffects = enemy.statusEffects.filter((s) => s.id !== 'stun');
          enemy.statusEffects.push({
            id: 'stun',
            name: 'Stunned',
            durationLeft: 1.2,
            totalDuration: 1.2,
            icon: 'Hammer',
            color: '#f59e0b',
            tickTimer: 0,
            speedMultiplier: 0,
          });
        }
      }
    } else if (ability.id === 103) {
      // Iron Bulwark: Defensive Fortify
      sound.playEquip();
      state.player.statusEffects = state.player.statusEffects.filter((s) => s.name !== 'Iron Bulwark');
      state.player.statusEffects.push({
        id: `bulwark-${this.nextEntityId++}`,
        name: 'Iron Bulwark',
        kind: 'buff',
        totalDuration: 5.0,
        durationLeft: 5.0,
        tickTimer: 0,
        icon: 'Shield',
        color: '#eab308',
      });
      // Golden shield particles
      for (let p = 0; p < 16; p++) {
        const a = (p / 16) * Math.PI * 2;
        state.particles.push({
          x: px + Math.cos(a) * 24,
          y: py + Math.sin(a) * 24,
          vx: Math.cos(a) * 20,
          vy: Math.sin(a) * 20,
          color: '#facc15',
          size: 4,
          life: 0.5,
          maxLife: 0.5,
        });
      }
      this.addCombatLog('Iron Bulwark activated! Incoming damage reduced by 40%!', 'heal');
    } else if (ability.id === 104) {
      // Whirlwind: 360 AoE Spin
      sound.playSwing();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.4;
      state.screenShake = 3;

      for (let p = 0; p < 24; p++) {
        const a = (p / 24) * Math.PI * 2;
        state.particles.push({
          x: px + Math.cos(a) * 30,
          y: py + Math.sin(a) * 30,
          vx: Math.cos(a + 1.2) * 140,
          vy: Math.sin(a + 1.2) * 140,
          color: '#e2e8f0',
          size: 3,
          life: 0.35,
          maxLife: 0.35,
        });
      }

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - px, enemy.y - py);
        if (dist <= 130 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
        }
      }
    }
    // 2. Archer Abilities (201..204)
    else if (ability.id === 201) {
      // Quick Shot: Fast piercing arrow
      sound.playSwing();
      state.projectiles.push({
        id: `arrow-${this.nextEntityId++}`,
        sourceId: 'player',
        x: px,
        y: py,
        vx: Math.cos(aimAngle) * 520,
        vy: Math.sin(aimAngle) * 520,
        speed: 520,
        damage: ability.baseDamage,
        school: DamageSchool.Physical,
        flags: ability.damageFlags,
        radius: 4,
        rangeLeft: 340,
        color: '#facc15',
      });
    } else if (ability.id === 202) {
      // Multi-Shot: 5-arrow fan spread
      sound.playSwing();
      const spreadAngles = [-0.32, -0.16, 0, 0.16, 0.32];
      for (const offset of spreadAngles) {
        const a = aimAngle + offset;
        state.projectiles.push({
          id: `m-arrow-${this.nextEntityId++}`,
          sourceId: 'player',
          x: px,
          y: py,
          vx: Math.cos(a) * 480,
          vy: Math.sin(a) * 480,
          speed: 480,
          damage: ability.baseDamage,
          school: DamageSchool.Physical,
          flags: ability.damageFlags,
          radius: 4,
          rangeLeft: 300,
          color: '#fbbf24',
        });
      }
    } else if (ability.id === 203) {
      // Rain of Arrows: Targeted barrage at cursor with slow
      sound.playFrost();
      let tx = this.worldMousePos.x;
      let ty = this.worldMousePos.y;
      const distFromPlayer = Math.hypot(tx - px, ty - py);
      if (distFromPlayer > 260) {
        tx = px + ((tx - px) / distFromPlayer) * 260;
        ty = py + ((ty - py) / distFromPlayer) * 260;
      }

      for (let p = 0; p < 22; p++) {
        const rx = tx + (Math.random() - 0.5) * 110;
        const ry = ty + (Math.random() - 0.5) * 110;
        state.particles.push({
          x: rx,
          y: ry - 40,
          vx: (Math.random() - 0.5) * 10,
          vy: 200,
          color: '#38bdf8',
          size: 3,
          life: 0.3,
          maxLife: 0.3,
        });
      }

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - tx, enemy.y - ty);
        if (dist <= 110 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
          enemy.statusEffects = enemy.statusEffects.filter((s) => s.id !== 'pinned');
          enemy.statusEffects.push({
            id: 'pinned',
            name: 'Pinned',
            durationLeft: 2.5,
            totalDuration: 2.5,
            icon: 'Crosshair',
            color: '#38bdf8',
            tickTimer: 0,
            speedMultiplier: 0.5,
          });
        }
      }
    } else if (ability.id === 204) {
      // Evasive Vault: Dash + Speed boost
      sound.playDash();
      const dashDist = 200;
      const steps = 8;
      const stepDist = dashDist / steps;
      let currX = px;
      let currY = py;

      for (let s = 0; s < steps; s++) {
        const stepDx = Math.cos(aimAngle) * stepDist;
        const stepDy = Math.sin(aimAngle) * stepDist;
        const next = currentMap.resolveCircleMovement(currX, currY, stepDx, stepDy, 14);
        currX = next.x;
        currY = next.y;
      }

      for (let s = 1; s <= 4; s++) {
        const t = s / 5;
        state.particles.push({
          x: px + (currX - px) * t,
          y: py + (currY - py) * t,
          vx: 0,
          vy: 0,
          color: '#34d399',
          size: 16,
          life: 0.28 + s * 0.04,
          maxLife: 0.35,
          kind: 'afterimage',
          angle: aimAngle,
          playerClass: state.selectedClass,
        });
      }

      for (let s = 0; s < 12; s++) {
        const rx = px + (currX - px) * (s / 12);
        const ry = py + (currY - py) * (s / 12);
        state.particles.push({
          x: rx,
          y: ry,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          color: '#34d399',
          size: 4,
          life: 0.3,
          maxLife: 0.3,
        });
      }

      state.player.x = currX;
      state.player.y = currY;

      state.player.statusEffects = state.player.statusEffects.filter((s) => s.name !== 'Windwalk');
      state.player.statusEffects.push({
        id: `wind-${this.nextEntityId++}`,
        name: 'Windwalk',
        kind: 'buff',
        totalDuration: 2.5,
        durationLeft: 2.5,
        tickTimer: 0,
        speedMultiplier: 1.45,
        icon: 'Wind',
        color: '#34d399',
      });
    }
    // 3. Mage Abilities (301..304 or generic fallback 2, 3, 4)
    else if (ability.id === 301) {
      // Arcane Bolt: Fast arcane projectile
      sound.playFrost();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.22;
      state.projectiles.push({
        id: `arcane-${this.nextEntityId++}`,
        sourceId: 'player',
        x: px,
        y: py,
        vx: Math.cos(aimAngle) * 440,
        vy: Math.sin(aimAngle) * 440,
        speed: 440,
        damage: ability.baseDamage,
        school: DamageSchool.Arcane,
        flags: ability.damageFlags,
        radius: 7,
        rangeLeft: 320,
        color: '#38bdf8',
      });
    } else if (ability.id === 302 || ability.id === 2) {
      // Inferno Burst / Fireball: Activation cue + Explosive fire sphere
      sound.playFireball();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.26;
      state.particles.push({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        color: '#fb923c',
        size: 36,
        life: 0.26,
        maxLife: 0.26,
        kind: 'ring',
      });
      state.projectiles.push({
        id: `fire-${this.nextEntityId++}`,
        sourceId: 'player',
        x: px,
        y: py,
        vx: Math.cos(aimAngle) * 360,
        vy: Math.sin(aimAngle) * 360,
        speed: 360,
        damage: ability.baseDamage,
        school: DamageSchool.Fire,
        flags: ability.damageFlags,
        radius: 9,
        rangeLeft: 300,
        color: '#f97316',
      });
    } else if (ability.id === 303 || ability.id === 3) {
      // Frost Nova: Radial freezing wave + Crystalline ground glyph + Icy shards
      sound.playFrost();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.28;
      state.particles.push({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        color: '#38bdf8',
        size: 160,
        life: 0.65,
        maxLife: 0.65,
        kind: 'frost_nova',
      });

      for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 * i) / 24;
        state.particles.push({
          x: px,
          y: py,
          vx: Math.cos(a) * 165,
          vy: Math.sin(a) * 165,
          color: i % 2 === 0 ? '#bae6fd' : '#38bdf8',
          size: 5,
          life: 0.45,
          maxLife: 0.45,
          kind: 'shard',
          angle: a,
        });
      }

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - px, enemy.y - py);
        if (dist <= 160 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
          enemy.statusEffects = enemy.statusEffects.filter((s) => s.id !== 'chill');
          enemy.statusEffects.push({
            id: 'chill',
            name: 'Chilled',
            durationLeft: 4.0,
            totalDuration: 4.0,
            icon: 'Snowflake',
            color: '#38bdf8',
            tickTimer: 0,
            speedMultiplier: 0.45,
          });
        }
      }
    } else if (ability.id === 304 || ability.id === 4) {
      // Aether Blink / Dash: Instant teleport with hero afterimages & warp rings
      sound.playDash();
      const blinkDist = ability.range || 220;
      const steps = 8;
      const stepDist = blinkDist / steps;
      let currX = px;
      let currY = py;

      for (let s = 0; s < steps; s++) {
        const stepDx = Math.cos(aimAngle) * stepDist;
        const stepDy = Math.sin(aimAngle) * stepDist;
        const next = currentMap.resolveCircleMovement(currX, currY, stepDx, stepDy, 14);
        currX = next.x;
        currY = next.y;
      }

      // Origin & Destination warp rings
      state.particles.push(
        {
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          color: '#38bdf8',
          size: 42,
          life: 0.32,
          maxLife: 0.32,
          kind: 'shockwave',
        },
        {
          x: currX,
          y: currY,
          vx: 0,
          vy: 0,
          color: '#c084fc',
          size: 54,
          life: 0.36,
          maxLife: 0.36,
          kind: 'shockwave',
        }
      );

      // 4 Fading Hero Silhouette Afterimages along the dash path
      for (let s = 1; s <= 4; s++) {
        const t = s / 5;
        state.particles.push({
          x: px + (currX - px) * t,
          y: py + (currY - py) * t,
          vx: 0,
          vy: 0,
          color: '#c084fc',
          size: 16,
          life: 0.25 + s * 0.05,
          maxLife: 0.4,
          kind: 'afterimage',
          angle: aimAngle,
          playerClass: state.selectedClass,
        });
      }

      for (let s = 0; s < 14; s++) {
        const tx = px + (currX - px) * (s / 14);
        const ty = py + (currY - py) * (s / 14);
        state.particles.push({
          x: tx,
          y: ty,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          color: '#a855f7',
          size: 5,
          life: 0.35,
          maxLife: 0.35,
        });
      }
      state.player.x = currX;
      state.player.y = currY;

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - currX, enemy.y - currY);
        if (dist <= 75 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
        }
      }
    }
    // 4. Necromancer Abilities (401..404)
    else if (ability.id === 401) {
      // Shadow Bolt: Screaming skull bolt
      sound.playFrost();
      state.projectiles.push({
        id: `shadow-${this.nextEntityId++}`,
        sourceId: 'player',
        x: px,
        y: py,
        vx: Math.cos(aimAngle) * 400,
        vy: Math.sin(aimAngle) * 400,
        speed: 400,
        damage: ability.baseDamage,
        school: DamageSchool.Shadow,
        flags: ability.damageFlags,
        radius: 8,
        rangeLeft: 300,
        color: '#c084fc',
      });
    } else if (ability.id === 402) {
      // Life Drain: Siphons life from enemy to heal player
      let target: EnemyEntity | null = null;
      let minAngleDiff = 0.9;
      for (const enemy of state.enemies) {
        const dx = enemy.x - px;
        const dy = enemy.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist <= 220) {
          const a = Math.atan2(dy, dx);
          const diff = Math.abs(Math.atan2(Math.sin(a - aimAngle), Math.cos(a - aimAngle)));
          if (diff < minAngleDiff) {
            minAngleDiff = diff;
            target = enemy;
          }
        }
      }

      if (target) {
        sound.playPotion();
        this.applyPlayerDamageToEnemy(target, ability);
        const maxHp = state.playerStats.calculated[StatType.MaxHealth];
        const healAmt = 35;
        state.playerStats.health = Math.min(maxHp, state.playerStats.health + healAmt);

        for (let p = 0; p < 12; p++) {
          const t = p / 12;
          state.particles.push({
            x: target.x + (px - target.x) * t,
            y: target.y + (py - target.y) * t,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            color: '#a855f7',
            size: 4,
            life: 0.35,
            maxLife: 0.35,
          });
        }
        this.addCombatLog(`Drained essence from ${target.name} (+${healAmt} HP)!`, 'heal');
      } else {
        this.addCombatLog('No enemy in range for Life Drain!', 'system');
      }
    } else if (ability.id === 403) {
      // Summon Skeleton: Spawns faithful minion
      sound.playFrost();
      if (state.summons.length >= 3) {
        state.summons.shift(); // Max 3 minions
      }

      const summon: SummonEntity = {
        id: `summon-${this.nextEntityId++}`,
        name: 'Skeletal Warrior',
        x: px + (Math.random() - 0.5) * 40,
        y: py + (Math.random() - 0.5) * 40,
        health: 180,
        maxHealth: 180,
        attackPower: 22 + state.playerStats.level * 3,
        attackRange: 40,
        attackCooldown: 1.2,
        attackTimer: 0.3,
        moveSpeed: 110,
        durationLeft: 45,
        maxDuration: 45,
        facingAngle: aimAngle,
        color: '#94a3b8',
      };
      state.summons.push(summon);

      for (let p = 0; p < 14; p++) {
        state.particles.push({
          x: summon.x,
          y: summon.y,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          color: '#c084fc',
          size: 4,
          life: 0.4,
          maxLife: 0.4,
        });
      }
      this.addCombatLog('A Skeletal Warrior rises to fight at your command!', 'system');
    } else if (ability.id === 404) {
      // Bone Armor: Revolving bone barrier + AoE shadow pulse
      sound.playEquip();
      state.player.statusEffects = state.player.statusEffects.filter((s) => s.name !== 'Bone Armor');
      state.player.statusEffects.push({
        id: `bone-${this.nextEntityId++}`,
        name: 'Bone Armor',
        kind: 'buff',
        totalDuration: 6.0,
        durationLeft: 6.0,
        tickTimer: 0,
        icon: 'Shield',
        color: '#cbd5e1',
      });

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - px, enemy.y - py);
        if (dist <= 85 + enemy.size) {
          this.applyPlayerDamageToEnemy(enemy, ability);
        }
      }

      for (let p = 0; p < 18; p++) {
        const a = (p / 18) * Math.PI * 2;
        state.particles.push({
          x: px + Math.cos(a) * 26,
          y: py + Math.sin(a) * 26,
          vx: Math.cos(a) * 30,
          vy: Math.sin(a) * 30,
          color: '#e2e8f0',
          size: 4,
          life: 0.4,
          maxLife: 0.4,
        });
      }
      this.addCombatLog('Bone Armor activated! Defense fortified!', 'heal');
    }
  }

  private applyPlayerDamageToEnemy(
    enemy: EnemyEntity,
    ability: { baseDamage: number; school: DamageSchool; damageFlags?: number; [key: string]: any }
  ) {
    if (enemy.isDead || enemy.health <= 0) return;
    const state = this.state;
    const calc = resolveDamagePipeline({
      baseAmount: ability.baseDamage,
      school: ability.school,
      flags: ability.damageFlags ?? 0,
      attackerAttackPower: state.playerStats.calculated[StatType.AttackPower],
      attackerSpellPower: state.playerStats.calculated[StatType.SpellPower],
      attackerCritChance: state.playerStats.calculated[StatType.CritChance],
      attackerCritMultiplier: state.playerStats.calculated[StatType.CritMultiplier],
      targetArmor: enemy.armor,
      targetEvasion: 0,
    });

    enemy.health -= calc.damage;
    enemy.isHitFlashTimer = 0.14;

    // Apply subtle knockback away from player for non-boss enemies
    if (enemy.archetype !== 'dungeon_lord') {
      const kdx = enemy.x - state.player.x;
      const kdy = enemy.y - state.player.y;
      const kdist = Math.hypot(kdx, kdy) || 1;
      const kbStrength = calc.isCrit ? 120 : 65;
      enemy.knockbackVx = (kdx / kdist) * kbStrength;
      enemy.knockbackVy = (kdy / kdist) * kbStrength;
    }

    if (calc.isCrit) {
      state.screenShake = Math.max(state.screenShake, 3.5);
    }

    sound.playHit(calc.isCrit);

    // Floating text
    state.floatingTexts.push({
      id: `fct-${this.nextEntityId++}`,
      text: calc.isCrit ? `${calc.damage}!` : `${calc.damage}`,
      x: enemy.x + (Math.random() - 0.5) * 20,
      y: enemy.y,
      color: calc.isCrit ? '#facc15' : getSchoolColor(ability.school),
      isCrit: calc.isCrit,
      lifetime: 0.9,
      maxLifetime: 0.9,
    });

    // Particle splash + directional slash on crit/melee
    const hitColor = getSchoolColor(ability.school);
    if (calc.isCrit || ability.school === DamageSchool.Physical) {
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: 0,
        vy: 0,
        color: calc.isCrit ? '#facc15' : hitColor,
        size: calc.isCrit ? 16 : 12,
        life: 0.22,
        maxLife: 0.22,
        kind: 'slash',
        angle: Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x),
      });
    }
    for (let p = 0; p < 7; p++) {
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 155,
        vy: (Math.random() - 0.5) * 155,
        color: hitColor,
        size: 3,
        life: 0.3,
        maxLife: 0.3,
        kind: 'spark',
      });
    }

    if (enemy.health <= 0) {
      this.handleEnemyKilled(enemy);
    }
  }

  private handleEnemyKilled(enemy: EnemyEntity) {
    if (enemy.rewardClaimed) return;
    enemy.rewardClaimed = true;
    enemy.isDead = true;

    const state = this.state;
    this.addCombatLog(`Slain ${enemy.name}! (+${enemy.xpReward} XP)`, 'kill');

    // Add XP & Gold
    state.playerStats.xp += enemy.xpReward;
    const goldDrop = (Math.floor(Math.random() * 15) + 10) * (enemy.isElite ? 2 : 1);
    state.playerStats.gold += goldDrop;

    // Death ring + shattering bone / soul burst
    state.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      color: enemy.color || '#ef4444',
      size: enemy.size * 1.6,
      life: 0.42,
      maxLife: 0.42,
      kind: 'shockwave',
    });

    for (let b = 0; b < 8; b++) {
      const ba = (b / 8) * Math.PI * 2;
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(ba) * (45 + Math.random() * 55),
        vy: Math.sin(ba) * (45 + Math.random() * 55),
        color: enemy.archetype === 'skeleton_warrior' ? '#e2e8f0' : enemy.color,
        size: 5,
        life: 0.45,
        maxLife: 0.45,
        kind: enemy.archetype === 'skeleton_warrior' ? 'bone_frag' : 'ember',
        angle: ba,
      });
    }

    // Check level up
    while (state.playerStats.xp >= state.playerStats.xpToNextLevel) {
      state.playerStats.xp -= state.playerStats.xpToNextLevel;
      state.playerStats.level += 1;
      state.playerStats.xpToNextLevel = Math.round(state.playerStats.xpToNextLevel * 1.5);
      state.unallocatedStatPoints += 3;
      sound.playLevelUp();
      this.addCombatLog(`Leveled up to Level ${state.playerStats.level}! +3 Attribute Points`, 'system');

      // Full heal & mana on level up
      this.recalculatePlayerStats();
      state.playerStats.health = state.playerStats.calculated[StatType.MaxHealth];
      state.playerStats.mana = state.playerStats.calculated[StatType.MaxMana];
      this.autoSave();
    }

    // Roll Loot
    const tableKey =
      enemy.archetype === 'dungeon_lord'
        ? 'boss'
        : enemy.isElite || enemy.archetype === 'necromancer' || enemy.archetype === 'abyssal_brute'
        ? 'elite'
        : 'trash';
    const droppedItems = rollLoot(tableKey, undefined, state.currentFloor);

    for (const item of droppedItems) {
      state.lootDrops.push({
        id: `drop-${this.nextEntityId++}`,
        x: enemy.x + (Math.random() - 0.5) * 30,
        y: enemy.y + (Math.random() - 0.5) * 30,
        item,
        creationTime: Date.now(),
      });
      sound.playLootDrop();
    }

    if (enemy.archetype === 'dungeon_lord') {
      state.floorCleared = true;
      state.screenShake = 14;
      sound.playBossDeath();
      if (!state.clearedFloors.includes(state.currentFloor)) {
        state.clearedFloors.push(state.currentFloor);
      }
      state.highestFloorUnlocked = Math.max(state.highestFloorUnlocked, Math.min(10, state.currentFloor + 1));
      this.autoSave();
      if (state.currentFloor >= 10) {
        this.addCombatLog(`👑 IGNIS REX SLAIN! The Abyss is conquered! Enter the Portal to finalize victory!`, 'system');
      } else {
        this.addCombatLog(`👑 ${enemy.name} slain! The Portal to Floor ${state.currentFloor + 1} has unlocked!`, 'system');
      }
    }
  }

  public update(dt: number) {
    const state = this.state;
    if (this.isPaused || state.isGameOver || state.isVictory) return;

    // 1. Ability Cooldowns update
    for (const idStr of Object.keys(state.abilityCooldowns)) {
      const id = Number(idStr);
      if (state.abilityCooldowns[id] > 0) {
        state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
      }
    }

    // 2. Attack animation timer
    if (state.player.attackAnimTimer > 0) {
      state.player.attackAnimTimer -= dt;
      if (state.player.attackAnimTimer <= 0) {
        state.player.isAttacking = false;
      }
    }

    // 3. Player Movement
    // Translate screen directions to 2.5D isometric world coordinates:
    // Screen Up (sy < 0): wx < 0, wy < 0
    // Screen Down (sy > 0): wx > 0, wy > 0
    // Screen Left (sx < 0): wx < 0, wy > 0
    // Screen Right (sx > 0): wx > 0, wy < 0
    let sx = 0;
    let sy = 0;
    if (this.isMoveActive('up')) sy -= 1;
    if (this.isMoveActive('down')) sy += 1;
    if (this.isMoveActive('left')) sx -= 1;
    if (this.isMoveActive('right')) sx += 1;

    let wx = 0;
    let wy = 0;
    if (sx !== 0 || sy !== 0) {
      wx = 2 * sy + sx;
      wy = 2 * sy - sx;
      const len = Math.hypot(wx, wy);
      if (len > 0) {
        wx /= len;
        wy /= len;
      }
    }

    const moveSpeedStat = state.playerStats.calculated[StatType.MoveSpeed];
    let actualSpeed = 365 * (moveSpeedStat / 100);
    if (state.currentZone === 'town') {
      actualSpeed *= 1.28;
    }

    for (const eff of state.player.statusEffects) {
      if (eff.speedMultiplier) {
        actualSpeed *= eff.speedMultiplier;
      }
    }

    const playerRadius = 14;
    const currentMap = state.currentZone === 'town' ? state.townLevel.map : state.dungeon.map;

    // Environmental Hazards & Interactive Terrain
    const playerTile = currentMap.worldToTile(state.player.x, state.player.y);
    const tileUnderPlayer = currentMap.get(playerTile.x, playerTile.y);

    // Substantially slow down player movement when wading through water tiles (both Town-1 and Dungeons)
    if (tileUnderPlayer === TileType.Water) {
      actualSpeed *= 0.32;
      state.player.vx = wx * actualSpeed;
      state.player.vy = wy * actualSpeed;
      if ((wx !== 0 || wy !== 0) && Math.random() < 0.25) {
        state.particles.push({
          x: state.player.x + (Math.random() - 0.5) * 14,
          y: state.player.y + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 28,
          vy: (Math.random() - 0.5) * 28 - 10,
          color: '#7dd3fc',
          size: 2.5,
          life: 0.35,
          maxLife: 0.35,
        });
      }
    }

    if (state.currentZone === 'town') {
      // Advance 24-hour overworld daylight cycle: 24 hours per 240 real-time seconds (4 minutes)
      state.worldTimeHours = ((state.worldTimeHours ?? 9.5) + dt * (24 / 240)) % 24;

      // Fountain regeneration in town
      const fountain = state.townLevel.fountainPos;
      if (fountain && Math.hypot(state.player.x - fountain.x, state.player.y - fountain.y) <= 85) {
        const maxHp = state.playerStats.calculated[StatType.MaxHealth];
        const maxMp = state.playerStats.calculated[StatType.MaxMana];
        state.playerStats.health = Math.min(maxHp, state.playerStats.health + 35 * dt);
        state.playerStats.mana = Math.min(maxMp, state.playerStats.mana + 30 * dt);
      }

      // Populate NPC Spatial Partitioning Grid & Strictly Prevent NPCs From Stepping on Water Tiles
      this.npcSpatialGrid.clear();
      let closestNpc: NPCEntity | null = null;
      let closestDistSq = 85 * 85;
      const fullCollisionRadiusSq = 1200 * 1200;
      const npcRadius = 15;

      for (const npc of state.townLevel.npcs) {
        // Strict water & riverbank guard: if an NPC is ever on or too close to a Water tile, push immediately to safe dry Floor
        if (!currentMap.isCircleWalkable(npc.x, npc.y, npcRadius + 4, true)) {
          const dry = currentMap.findNearestDryWorldPos(npc.x, npc.y, npcRadius + 16);
          npc.x = dry.x;
          npc.y = dry.y;
        }

        const pdx = state.player.x - npc.x;
        const pdy = state.player.y - npc.y;
        const distSqToPlayer = pdx * pdx + pdy * pdy;

        if (distSqToPlayer < closestDistSq) {
          closestDistSq = distSqToPlayer;
          closestNpc = npc;
        }

        // Pause and face the player when they approach to talk or trade, performing friendly nods & greetings
        if (distSqToPlayer < 72 * 72) {
          npc.vx = 0;
          npc.vy = 0;
          npc.facingAngle = Math.atan2(pdy, pdx);
          npc.idlePhase = (npc.idlePhase ?? 0) + dt;
          npc.idleTimer = (npc.idleTimer ?? 0) - dt;
          if ((npc.idleTimer ?? 0) <= 0 || (npc.idleAction !== 'nodding' && npc.idleAction !== 'wave_greet')) {
            npc.idleAction = Math.random() < 0.58 ? 'nodding' : 'wave_greet';
            npc.idleTimer = 1.6 + Math.random() * 1.8;
          }
          const phase = npc.idlePhase;
          const targetYaw = Math.sin(phase * 1.8) * 0.25;
          const targetPitch =
            npc.idleAction === 'nodding' ? Math.max(0, Math.sin(phase * 6.2)) * 0.85 : Math.sin(phase * 2.5) * 0.18;
          npc.headYaw = (npc.headYaw ?? 0) + (targetYaw - (npc.headYaw ?? 0)) * Math.min(1, dt * 8);
          npc.headPitch = (npc.headPitch ?? 0) + (targetPitch - (npc.headPitch ?? 0)) * Math.min(1, dt * 10);
          this.npcSpatialGrid.insert(npc, npc.x, npc.y, npcRadius);
          continue;
        }

        // Spatial simulation culling: skip pathing math for NPCs very far outside the active area
        if (distSqToPlayer > 1800 * 1800) {
          npc.vx = 0;
          npc.vy = 0;
          this.npcSpatialGrid.insert(npc, npc.x, npc.y, npcRadius);
          continue;
        }

        const selectNextDryWaypoint = () => {
          if (!npc.waypoints || npc.waypoints.length === 0) return;
          const nextIdx = ((npc.currentWaypointIdx ?? 0) + 1) % npc.waypoints.length;
          npc.currentWaypointIdx = nextIdx;
          npc.stuckTimer = 0;
          const wp = npc.waypoints[nextIdx];
          const jitterX = wp.x + (Math.random() - 0.5) * 10;
          const jitterY = wp.y + (Math.random() - 0.5) * 10;
          if (currentMap.isCircleWalkable(jitterX, jitterY, npcRadius + 14, true)) {
            npc.targetX = jitterX;
            npc.targetY = jitterY;
          } else {
            const dryWp = currentMap.findNearestDryWorldPos(wp.x, wp.y, npcRadius + 16);
            npc.targetX = dryWp.x;
            npc.targetY = dryWp.y;
          }
          if (npc.activities && npc.activities.length > 0) {
            npc.activityText = npc.activities[nextIdx % npc.activities.length];
          }
        };

        if (npc.waypoints && npc.waypoints.length > 0) {
          if (npc.waitTimer !== undefined && npc.waitTimer > 0) {
            npc.waitTimer -= dt;
            npc.vx = 0;
            npc.vy = 0;
            npc.idlePhase = (npc.idlePhase ?? 0) + dt;
            npc.idleTimer = (npc.idleTimer ?? 0) - dt;
            if ((npc.idleTimer ?? 0) <= 0 || !npc.idleAction) {
              const roll = Math.random();
              npc.idleAction =
                roll < 0.42
                  ? 'look_around'
                  : roll < 0.76
                  ? 'nodding'
                  : npc.role !== 'villager'
                  ? 'inspect_work'
                  : 'breathing';
              npc.idleTimer = 1.8 + Math.random() * 2.2;
            }
            const phase = npc.idlePhase;
            const targetYaw =
              npc.idleAction === 'look_around'
                ? Math.sin(phase * 2.1 + npc.x * 0.02) * 0.92
                : Math.sin(phase * 1.1) * 0.22;
            const targetPitch =
              npc.idleAction === 'nodding'
                ? Math.max(-0.15, Math.sin(phase * 5.8)) * 0.85
                : npc.idleAction === 'inspect_work'
                ? 0.45 + Math.sin(phase * 3.2) * 0.25
                : Math.sin(phase * 2.0) * 0.12;
            npc.headYaw = (npc.headYaw ?? 0) + (targetYaw - (npc.headYaw ?? 0)) * Math.min(1, dt * 7);
            npc.headPitch = (npc.headPitch ?? 0) + (targetPitch - (npc.headPitch ?? 0)) * Math.min(1, dt * 9);

            if (npc.waitTimer <= 0) {
              npc.idleAction = 'breathing';
              selectNextDryWaypoint();
            }
          } else {
            // Smoothly recenter head gaze while walking
            npc.headYaw = (npc.headYaw ?? 0) * Math.max(0, 1 - dt * 8);
            npc.headPitch = (npc.headPitch ?? 0) * Math.max(0, 1 - dt * 8);
            const tx = npc.targetX ?? npc.x;
            const ty = npc.targetY ?? npc.y;
            const dx = tx - npc.x;
            const dy = ty - npc.y;
            const dist = Math.hypot(dx, dy);
            const spd = (npc.moveSpeed || 42) * 1.15;

            if (dist <= 10) {
              npc.vx = 0;
              npc.vy = 0;
              npc.stuckTimer = 0;
              npc.waitTimer = 2.8 + Math.random() * 4.0;
              npc.idleAction = Math.random() < 0.5 ? 'look_around' : 'nodding';
              npc.idleTimer = 1.8 + Math.random() * 2.0;
              if (npc.activities && npc.activities.length > 0) {
                const actIdx = Math.floor(Math.random() * npc.activities.length);
                npc.activityText = npc.activities[actIdx];
              }
            } else {
              // Compute riverbank water-repulsion vector so NPCs naturally steer away from river/pond edges
              const npcTile = currentMap.worldToTile(npc.x, npc.y);
              let repelX = 0;
              let repelY = 0;
              for (let wy = -1; wy <= 1; wy++) {
                for (let wx = -1; wx <= 1; wx++) {
                  if (wx === 0 && wy === 0) continue;
                  const ntx = npcTile.x + wx;
                  const nty = npcTile.y + wy;
                  if (currentMap.get(ntx, nty) === TileType.Water) {
                    const wCenter = currentMap.tileToWorldCenter(ntx, nty);
                    const rx = npc.x - wCenter.x;
                    const ry = npc.y - wCenter.y;
                    const rDist = Math.hypot(rx, ry) || 1;
                    if (rDist < 72) {
                      const pushStrength = (72 - rDist) / 72;
                      repelX += (rx / rDist) * pushStrength * 0.85;
                      repelY += (ry / rDist) * pushStrength * 0.85;
                    }
                  }
                }
              }

              const invDist = 1 / dist;
              let dirX = dx * invDist + repelX;
              let dirY = dy * invDist + repelY;
              const dirLen = Math.hypot(dirX, dirY) || 1;
              dirX /= dirLen;
              dirY /= dirLen;

              const stepMag = spd * dt;
              const stepX = dirX * stepMag;
              const stepY = dirY * stepMag;

              if (distSqToPlayer <= fullCollisionRadiusSq) {
                // Strictly forbid Water tiles (forbidWater = true) with extra shoreline safety margin
                const resolved = currentMap.resolveCircleMovement(
                  npc.x,
                  npc.y,
                  stepX,
                  stepY,
                  npcRadius + 3,
                  true
                );
                const movedDist = Math.hypot(resolved.x - npc.x, resolved.y - npc.y);

                if (
                  movedDist >= stepMag * 0.45 &&
                  currentMap.isCircleWalkable(resolved.x, resolved.y, npcRadius + 3, true)
                ) {
                  npc.x = resolved.x;
                  npc.y = resolved.y;
                  npc.vx = dirX * spd;
                  npc.vy = dirY * spd;
                  npc.facingAngle = Math.atan2(dirY, dirX);
                  npc.stuckTimer = Math.max(0, (npc.stuckTimer ?? 0) - dt * 0.5);
                } else {
                  // 8-angle tangential steering around riverbanks or obstacles
                  const baseAngle = Math.atan2(dirY, dirX);
                  const steerOffsets = [0.42, -0.42, 0.85, -0.85, 1.25, -1.25, 1.65, -1.65];
                  let steered = false;
                  for (const off of steerOffsets) {
                    const ang = baseAngle + off;
                    const sx = Math.cos(ang) * stepMag;
                    const sy = Math.sin(ang) * stepMag;
                    const alt = currentMap.resolveCircleMovement(
                      npc.x,
                      npc.y,
                      sx,
                      sy,
                      npcRadius + 3,
                      true
                    );
                    if (
                      Math.hypot(alt.x - npc.x, alt.y - npc.y) >= stepMag * 0.55 &&
                      currentMap.isCircleWalkable(alt.x, alt.y, npcRadius + 3, true)
                    ) {
                      npc.x = alt.x;
                      npc.y = alt.y;
                      npc.vx = Math.cos(ang) * spd;
                      npc.vy = Math.sin(ang) * spd;
                      npc.facingAngle = ang;
                      steered = true;
                      break;
                    }
                  }
                  npc.stuckTimer = (npc.stuckTimer ?? 0) + dt;
                  // If blocked or stuck near a riverbank for > 0.35s, advance immediately to the next dry waypoint!
                  if (!steered || npc.stuckTimer > 0.35) {
                    selectNextDryWaypoint();
                    npc.vx = 0;
                    npc.vy = 0;
                    npc.waitTimer = 0.25;
                  }
                }
              } else {
                const nextX = npc.x + stepX;
                const nextY = npc.y + stepY;
                if (currentMap.isCircleWalkable(nextX, nextY, npcRadius + 3, true)) {
                  npc.x = nextX;
                  npc.y = nextY;
                  npc.vx = dirX * spd;
                  npc.vy = dirY * spd;
                  npc.facingAngle = Math.atan2(dirY, dirX);
                  npc.stuckTimer = 0;
                } else {
                  selectNextDryWaypoint();
                  npc.vx = 0;
                  npc.vy = 0;
                  npc.waitTimer = 0.25;
                }
              }
            }
          }
        }

        this.npcSpatialGrid.insert(npc, npc.x, npc.y, npcRadius);
      }
      state.activeNPC = closestNpc;

      // Update Positional Town-1 Ambient Audio Manager (birds, wind, water, market chatter, forge, chimes)
      let waterTileWeight = 0;
      let waterPanAcc = 0;
      let treeTileWeight = 0;
      let treePanAcc = 0;
      const scanRadius = 5;
      const townFlags = state.townLevel.tileFlags;
      const mapWidth = currentMap.width;
      const mapHeight = currentMap.height;

      for (let dy = -scanRadius; dy <= scanRadius; dy++) {
        const ty = playerTile.y + dy;
        if (ty < 0 || ty >= mapHeight) continue;
        for (let dx = -scanRadius; dx <= scanRadius; dx++) {
          const tx = playerTile.x + dx;
          if (tx < 0 || tx >= mapWidth) continue;
          const distTiles = Math.hypot(dx, dy);
          if (distTiles > scanRadius) continue;
          const falloff = 1 - distTiles / (scanRadius + 0.5);
          const idx = ty * mapWidth + tx;
          const tType = currentMap.get(tx, ty);
          const isoPan = Math.max(-0.85, Math.min(0.85, ((dx - dy) * 0.7071) / scanRadius));

          if (tType === TileType.Water) {
            waterTileWeight += falloff;
            waterPanAcc += isoPan * falloff;
          } else if (townFlags && (townFlags[idx] & TOWN_TILE_FLAG_TREE) !== 0) {
            treeTileWeight += falloff;
            treePanAcc += isoPan * falloff;
          }
        }
      }

      const waterProximity = Math.min(1, waterTileWeight / 4.5);
      const waterPan = waterTileWeight > 0.01 ? waterPanAcc / waterTileWeight : 0;
      const treeDensity = Math.min(1, treeTileWeight / 5.5);
      const treePan = treeTileWeight > 0.01 ? treePanAcc / treeTileWeight : 0;

      let isIndoors = false;
      for (let bIdx = 0; bIdx < state.townLevel.buildings.length; bIdx++) {
        if (
          isPlayerInsideBuilding(
            state.player.x,
            state.player.y,
            currentMap,
            state.townLevel.buildings[bIdx]
          )
        ) {
          isIndoors = true;
          break;
        }
      }

      const nearbyNpcs = this.npcSpatialGrid.queryRadius(state.player.x, state.player.y, 440);
      let nearestNpcPan = 0;
      if (nearbyNpcs.length > 0) {
        nearestNpcPan = computeIsometricStereoPan(
          state.player.x,
          state.player.y,
          nearbyNpcs[0].x,
          nearbyNpcs[0].y,
          440
        );
      }

      const daylight = computeDaylightState(state.worldTimeHours ?? 9.5);
      const pIdx = playerTile.y * mapWidth + playerTile.x;
      const pFlags = townFlags ? townFlags[pIdx] : 0;

      sound.updateSpatialAmbience(dt, {
        zone: 'town',
        playerX: state.player.x,
        playerY: state.player.y,
        playerVx: wx * actualSpeed,
        playerVy: wy * actualSpeed,
        timeOfDayPhase: daylight.phase,
        isIndoors,
        isOnRoad: (pFlags & TOWN_TILE_FLAG_ROAD) !== 0,
        isInWater: tileUnderPlayer === TileType.Water,
        waterProximity,
        waterPan,
        treeDensity,
        treePan,
        nearbyNpcCount: nearbyNpcs.length,
        nearestNpcPan,
      });
    } else {
      state.activeNPC = null;
      sound.updateSpatialAmbience(dt, {
        zone: 'dungeon',
        playerX: state.player.x,
        playerY: state.player.y,
        playerVx: wx * actualSpeed,
        playerVy: wy * actualSpeed,
      });
      if (tileUnderPlayer === TileType.Lava) {
        if (!state.player.statusEffects.some((e) => e.name === 'Lava Burn')) {
          state.player.statusEffects.push({
            id: `lava-${this.nextEntityId++}`,
            name: 'Lava Burn',
            kind: 'dot',
            damagePerTick: 12,
            school: DamageSchool.Fire,
            totalDuration: 1.5,
            durationLeft: 1.5,
            tickTimer: 0,
            icon: 'Flame',
            color: '#f97316',
          });
          sound.playHit(false);
        }
      }
    }

    // Robust continuous collision resolution with smooth wall sliding
    if (wx !== 0 || wy !== 0) {
      const dx = wx * actualSpeed * dt;
      const dy = wy * actualSpeed * dt;
      const resolved = currentMap.resolveCircleMovement(
        state.player.x,
        state.player.y,
        dx,
        dy,
        playerRadius
      );
      state.player.x = resolved.x;
      state.player.y = resolved.y;

      // Play terrain-aware footsteps while moving
      if (tileUnderPlayer === TileType.Water) {
        sound.playFootstep('water');
      } else if (state.currentZone === 'town' && state.townLevel.tileFlags) {
        const pIdx = playerTile.y * currentMap.width + playerTile.x;
        const pFlags = state.townLevel.tileFlags[pIdx];
        if ((pFlags & TOWN_TILE_FLAG_INTERIOR_OAK) !== 0) {
          sound.playFootstep('wood');
        } else if ((pFlags & TOWN_TILE_FLAG_ROAD) !== 0) {
          sound.playFootstep('stone');
        } else {
          sound.playFootstep('grass');
        }
      } else {
        sound.playFootstep('stone');
      }
    }

    // Smooth Camera Follow
    const cellX = state.player.x / 64;
    const cellY = state.player.y / 64;
    const targetCamX = (cellX - cellY) * 32;
    const targetCamY = (cellX + cellY) * 16;

    const camFactor = 1 - Math.exp(-18 * dt);
    this.camera.x += (targetCamX - this.camera.x) * camFactor;
    this.camera.y += (targetCamY - this.camera.y) * camFactor;

    // Natural Mana & Health Regen
    state.playerStats.mana = Math.min(
      state.playerStats.calculated[StatType.MaxMana],
      state.playerStats.mana + (3 + state.playerStats.attributes[AttributeType.INT] * 0.4) * dt
    );

    // Player Status Effects (Regeneration HoTs, Burn DoTs)
    for (let s = state.player.statusEffects.length - 1; s >= 0; s--) {
      const eff = state.player.statusEffects[s];
      eff.durationLeft -= dt;

      // HoT
      if (eff.healPerTick) {
        eff.tickTimer += dt;
        if (eff.tickTimer >= 1.0) {
          eff.tickTimer = 0;
          const maxHp = state.playerStats.calculated[StatType.MaxHealth];
          state.playerStats.health = Math.min(maxHp, state.playerStats.health + eff.healPerTick);
          state.floatingTexts.push({
            id: `fct-${this.nextEntityId++}`,
            text: `+${eff.healPerTick}`,
            x: state.player.x,
            y: state.player.y - 14,
            color: '#22c55e',
            isCrit: false,
            lifetime: 0.8,
            maxLifetime: 0.8,
          });
        }
      }

      // DoT
      if (eff.damagePerTick) {
        eff.tickTimer += dt;
        if (eff.tickTimer >= 0.5) {
          eff.tickTimer = 0;
          state.playerStats.health -= eff.damagePerTick;
          state.floatingTexts.push({
            id: `fct-${this.nextEntityId++}`,
            text: `-${eff.damagePerTick}`,
            x: state.player.x,
            y: state.player.y - 14,
            color: eff.color || '#ef4444',
            isCrit: false,
            lifetime: 0.7,
            maxLifetime: 0.7,
          });
          if (state.playerStats.health <= 0) {
            state.playerStats.health = 0;
            state.isGameOver = true;
            this.addCombatLog('You perished to hazards in the abyss...', 'system');
          }
        }
      }

      if (eff.durationLeft <= 0) {
        state.player.statusEffects.splice(s, 1);
      }
    }

    // 4. Update Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.health <= 0) {
        state.enemies.splice(i, 1);
        continue;
      }

      if (enemy.isHitFlashTimer > 0) {
        enemy.isHitFlashTimer -= dt;
      }

      // Status effects (tick damage, speed mod)
      let currentSpeed = enemy.moveSpeed;
      for (let s = enemy.statusEffects.length - 1; s >= 0; s--) {
        const eff = enemy.statusEffects[s];
        eff.durationLeft -= dt;
        if (eff.speedMultiplier) {
          currentSpeed *= eff.speedMultiplier;
        }
        if (eff.damagePerTick) {
          eff.tickTimer += dt;
          if (eff.tickTimer >= 1.0) {
            eff.tickTimer = 0;
            enemy.health -= eff.damagePerTick;
            state.floatingTexts.push({
              id: `dot-${this.nextEntityId++}`,
              text: `${eff.damagePerTick}`,
              x: enemy.x,
              y: enemy.y,
              color: eff.color,
              isCrit: false,
              lifetime: 0.7,
              maxLifetime: 0.7,
            });
          }
        }
        if (eff.durationLeft <= 0) {
          enemy.statusEffects.splice(s, 1);
        }
      }

      // Apply decaying knockback velocity
      if (enemy.knockbackVx || enemy.knockbackVy) {
        const kbx = (enemy.knockbackVx || 0) * dt;
        const kby = (enemy.knockbackVy || 0) * dt;
        const resolvedKb = currentMap.resolveCircleMovement(enemy.x, enemy.y, kbx, kby, enemy.size * 0.65);
        enemy.x = resolvedKb.x;
        enemy.y = resolvedKb.y;
        enemy.knockbackVx = (enemy.knockbackVx || 0) * Math.exp(-10 * dt);
        enemy.knockbackVy = (enemy.knockbackVy || 0) * Math.exp(-10 * dt);
        if (Math.hypot(enemy.knockbackVx, enemy.knockbackVy) < 4) {
          enemy.knockbackVx = 0;
          enemy.knockbackVy = 0;
        }
      }

      // AI Behavior: Distance to player
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      enemy.facingAngle = Math.atan2(dy, dx);

      // Aggro / simulation radius across the expanded viewport
      if (dist < 740) {
        // Boss Mechanics: Multi-phase transitions & AoE Telegraphs
        if (enemy.archetype === 'dungeon_lord') {
          const hpRatio = enemy.health / enemy.maxHealth;

          // Phase 2 transition at 65% HP
          if (hpRatio <= 0.65 && (enemy.phase || 1) < 2) {
            enemy.phase = 2;
            state.screenShake = 8;
            sound.playBossRoar();
            this.addCombatLog(`🔥 ${enemy.name} enters Phase II: Arcane Nova & Cataclysm!`, 'system');
          }

          // Phase 3 Enrage transition at 50% HP
          if (hpRatio <= 0.5 && !enemy.isEnraged) {
            enemy.isEnraged = true;
            enemy.phase = 3;
            enemy.attackCooldown *= 0.65;
            enemy.moveSpeed += 25;
            state.screenShake = 12;
            this.addCombatLog(`⚠️ ${enemy.name.toUpperCase()} HAS ENRAGED! RUNIC HELLFIRE IMMINENT!`, 'system');
            sound.playBossRoar();
            for (let p = 0; p < 25; p++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = Math.random() * 180 + 60;
              state.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: '#ef4444',
                size: Math.random() * 4 + 3,
                life: 0.6,
                maxLife: 0.6,
                kind: 'spark',
              });
            }
          }

          // Special AoE Ground Telegraph
          if (enemy.specialAttackTimer !== undefined) {
            enemy.specialAttackTimer -= dt;
            if (enemy.specialAttackTimer <= 0) {
              enemy.specialAttackTimer = enemy.isEnraged ? 2.6 : 4.4;
              state.telegraphs.push({
                id: `tele-${this.nextEntityId++}`,
                x: state.player.x,
                y: state.player.y,
                radius: enemy.isEnraged ? 65 : 52,
                duration: 1.2,
                maxDuration: 1.2,
                damage: Math.round(enemy.attackPower * (enemy.isEnraged ? 1.55 : 1.2)),
                school: DamageSchool.Fire,
              });
              // In Phase 2/3, spawn secondary flanking ruptures
              if ((enemy.phase || 1) >= 2) {
                for (let k = 0; k < 2; k++) {
                  const ang = enemy.facingAngle + (k === 0 ? 0.85 : -0.85);
                  state.telegraphs.push({
                    id: `tele-${this.nextEntityId++}`,
                    x: state.player.x + Math.cos(ang) * 75,
                    y: state.player.y + Math.sin(ang) * 75,
                    radius: 42,
                    duration: 1.35,
                    maxDuration: 1.35,
                    damage: Math.round(enemy.attackPower * 1.1),
                    school: DamageSchool.Shadow,
                  });
                }
              }
              sound.playFireball();
              this.addCombatLog(`⚠️ Ground Rupture detonating beneath you! Evade!`, 'system');
            }
          }

          // Phase 1/2 Minion Reinforcements
          if (!enemy.isEnraged && enemy.summonTimer !== undefined) {
            enemy.summonTimer -= dt;
            if (enemy.summonTimer <= 0 && state.enemies.length < 8) {
              enemy.summonTimer = 16.0;
              this.addCombatLog(`${enemy.name} summons skeletal reinforcements!`, 'system');
              for (let s = 0; s < 2; s++) {
                const sx = enemy.x + (s === 0 ? -40 : 40);
                const sy = enemy.y + 20;
                state.enemies.push({
                  id: `minion-${this.nextEntityId++}`,
                  archetype: 'skeleton_warrior',
                  name: 'Summoned Marauder',
                  x: sx,
                  y: sy,
                  z: 0,
                  vx: 0,
                  vy: 0,
                  health: 60 + state.currentFloor * 10,
                  maxHealth: 60 + state.currentFloor * 10,
                  attackPower: 12 + state.currentFloor * 2,
                  armor: 6,
                  moveSpeed: 90,
                  attackRange: 45,
                  attackCooldown: 1.3,
                  attackTimer: 0.8,
                  xpReward: 15,
                  color: '#e2e8f0',
                  size: 14,
                  facingAngle: 0,
                  statusEffects: [],
                  isHitFlashTimer: 0,
                });
              }
            }
          }
        }

        // Necromancer periodic skeleton raise
        if (enemy.archetype === 'necromancer' && enemy.summonTimer !== undefined) {
          enemy.summonTimer -= dt;
          if (enemy.summonTimer <= 0 && state.enemies.length < 10) {
            enemy.summonTimer = 11.0;
            const sx = enemy.x + (Math.random() - 0.5) * 48;
            const sy = enemy.y + (Math.random() - 0.5) * 48;
            if (currentMap.isCircleWalkable(sx, sy, 12)) {
              state.enemies.push({
                id: `risen-${this.nextEntityId++}`,
                archetype: 'skeleton_warrior',
                name: 'Risen Thrall',
                x: sx,
                y: sy,
                z: 0,
                vx: 0,
                vy: 0,
                health: 55 + state.currentFloor * 10,
                maxHealth: 55 + state.currentFloor * 10,
                attackPower: 11 + state.currentFloor * 2,
                armor: 6,
                moveSpeed: 92,
                attackRange: 44,
                attackCooldown: 1.3,
                attackTimer: 0.6,
                xpReward: 12,
                color: '#cbd5e1',
                size: 13,
                facingAngle: enemy.facingAngle,
                statusEffects: [],
                isHitFlashTimer: 0,
              });
            }
          }
        }

        // Ranged kiting behavior for Archers when player gets too close
        if (enemy.archetype === 'goblin_archer' && dist < 85 && dist > 10) {
          const dirX = -dx / dist;
          const dirY = -dy / dist;
          const resolved = currentMap.resolveCircleMovement(
            enemy.x,
            enemy.y,
            dirX * currentSpeed * 0.75 * dt,
            dirY * currentSpeed * 0.75 * dt,
            enemy.size * 0.7
          );
          enemy.x = resolved.x;
          enemy.y = resolved.y;
          enemy.aiState = 'reposition';
        }

        if (dist > enemy.attackRange) {
          enemy.aiState = 'pursuit';
          // Move towards player with continuous sliding collision
          const dirX = dx / dist;
          const dirY = dy / dist;
          const enemyRadius = enemy.size * 0.7;
          const edx = dirX * currentSpeed * dt;
          const edy = dirY * currentSpeed * dt;

          const resolved = currentMap.resolveCircleMovement(
            enemy.x,
            enemy.y,
            edx,
            edy,
            enemyRadius
          );
          enemy.x = resolved.x;
          enemy.y = resolved.y;
        } else {
          // Attack in range - only if line of sight is clear (cannot shoot/attack through walls)
          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0.35) {
            enemy.aiState = 'windup';
          }
          if (enemy.attackTimer <= 0) {
            if (currentMap.hasLineOfSight(enemy.x, enemy.y, state.player.x, state.player.y)) {
              enemy.attackTimer = enemy.attackCooldown;
              enemy.aiState = 'attack';
              this.enemyAttack(enemy);
            }
          }
        }
      } else {
        enemy.aiState = 'idle';
      }
    }

    // Populate Enemy, Loot, and Dungeon Prop Spatial Grids for O(1) spatial queries & viewport culling
    this.enemySpatialGrid.clear();
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.health <= 0) {
        state.enemies.splice(i, 1);
        continue;
      }
      this.enemySpatialGrid.insert(e, e.x, e.y, e.size);
    }

    this.lootSpatialGrid.clear();
    for (let i = 0; i < state.lootDrops.length; i++) {
      const d = state.lootDrops[i];
      this.lootSpatialGrid.insert(d, d.x, d.y, 16);
    }

    if (state.currentZone === 'dungeon' && state.dungeon?.props) {
      this.dungeonPropSpatialGrid.clear();
      for (let i = 0; i < state.dungeon.props.length; i++) {
        const p = state.dungeon.props[i];
        this.dungeonPropSpatialGrid.insert(p, p.x, p.y, 24);
      }
    }

    // Enemy-Enemy Soft Separation using Spatial Grid (only separates active nearby enemies)
    const activeEnemies = this.enemySpatialGrid.queryRadius(
      state.player.x,
      state.player.y,
      850,
      this.nearbyEnemiesBuf
    );
    for (let i = 0; i < activeEnemies.length; i++) {
      for (let j = i + 1; j < activeEnemies.length; j++) {
        const e1 = activeEnemies[i];
        const e2 = activeEnemies[j];
        const sepX = e2.x - e1.x;
        const sepY = e2.y - e1.y;
        const sepDist = Math.hypot(sepX, sepY);
        const minDist = (e1.size + e2.size) * 0.75;
        if (sepDist > 0 && sepDist < minDist) {
          const push = (minDist - sepDist) * 0.5;
          const nx = (sepX / sepDist) * push;
          const ny = (sepY / sepDist) * push;
          if (currentMap.isCircleWalkable(e1.x - nx, e1.y - ny, e1.size * 0.5)) {
            e1.x -= nx;
            e1.y -= ny;
          }
          if (currentMap.isCircleWalkable(e2.x + nx, e2.y + ny, e2.size * 0.5)) {
            e2.x += nx;
            e2.y += ny;
          }
        }
      }
    }

    // 4.5 Update Minion Summons
    for (let i = state.summons.length - 1; i >= 0; i--) {
      const summon = state.summons[i];
      summon.durationLeft -= dt;
      if (summon.durationLeft <= 0 || summon.health <= 0) {
        for (let p = 0; p < 8; p++) {
          state.particles.push({
            x: summon.x,
            y: summon.y,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            color: '#64748b',
            size: 3,
            life: 0.3,
            maxLife: 0.3,
          });
        }
        state.summons.splice(i, 1);
        continue;
      }

      if (summon.attackTimer > 0) {
        summon.attackTimer -= dt;
      }

      // Find nearest enemy
      let nearestEnemy: EnemyEntity | null = null;
      let minEnemyDist = 380;
      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.x - summon.x, enemy.y - summon.y);
        if (d < minEnemyDist) {
          minEnemyDist = d;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        const edx = nearestEnemy.x - summon.x;
        const edy = nearestEnemy.y - summon.y;
        summon.facingAngle = Math.atan2(edy, edx);

        if (minEnemyDist > summon.attackRange) {
          const step = summon.moveSpeed * dt;
          const next = currentMap.resolveCircleMovement(
            summon.x,
            summon.y,
            (edx / minEnemyDist) * step,
            (edy / minEnemyDist) * step,
            12
          );
          summon.x = next.x;
          summon.y = next.y;
        } else if (summon.attackTimer <= 0) {
          summon.attackTimer = summon.attackCooldown;
          sound.playSwing();
          this.applyPlayerDamageToEnemy(nearestEnemy, {
            id: 99,
            name: 'Skeletal Strike',
            key: '',
            description: '',
            icon: '',
            baseDamage: summon.attackPower,
            school: DamageSchool.Shadow,
            damageFlags: 0,
            cooldownSec: 0,
            manaCost: 0,
            range: summon.attackRange,
          });
          state.particles.push({
            x: nearestEnemy.x,
            y: nearestEnemy.y,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            color: '#c084fc',
            size: 4,
            life: 0.25,
            maxLife: 0.25,
          });
        }
      } else {
        const pdx = state.player.x - summon.x;
        const pdy = state.player.y - summon.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist > 65) {
          summon.facingAngle = Math.atan2(pdy, pdx);
          const step = summon.moveSpeed * dt;
          const next = currentMap.resolveCircleMovement(
            summon.x,
            summon.y,
            (pdx / pdist) * step,
            (pdy / pdist) * step,
            12
          );
          summon.x = next.x;
          summon.y = next.y;
        }
      }
    }

    // 5. Update Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      const step = proj.speed * dt;
      proj.x += (proj.vx / proj.speed) * step;
      proj.y += (proj.vy / proj.speed) * step;
      proj.rangeLeft -= step;

      // Particle trail
      state.particles.push({
        x: proj.x,
        y: proj.y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        color: proj.color,
        size: 3,
        life: 0.2,
        maxLife: 0.2,
      });

      // Wall collision
      const t = currentMap.worldToTile(proj.x, proj.y);
      if (TileFlags.blocksProjectiles(currentMap.get(t.x, t.y))) {
        if (proj.school === DamageSchool.Fire && proj.sourceId === 'player') {
          state.particles.push(
            {
              x: proj.x,
              y: proj.y,
              vx: 0,
              vy: 0,
              color: '#f97316',
              size: 56,
              life: 0.65,
              maxLife: 0.65,
              kind: 'scorch',
            },
            {
              x: proj.x,
              y: proj.y,
              vx: 0,
              vy: 0,
              color: '#fef08a',
              size: 75,
              life: 0.32,
              maxLife: 0.32,
              kind: 'shockwave',
            }
          );
          for (const splash of state.enemies) {
            if (Math.hypot(splash.x - proj.x, splash.y - proj.y) <= 85) {
              this.applyPlayerDamageToEnemy(splash, {
                id: 99,
                name: 'Fire Splash',
                key: '',
                description: '',
                icon: '',
                baseDamage: proj.damage * 0.6,
                school: DamageSchool.Fire,
                damageFlags: proj.flags,
                cooldownSec: 0,
                manaCost: 0,
                range: 0,
              });
            }
          }
        }
        state.projectiles.splice(i, 1);
        continue;
      }

      if (proj.sourceId === 'player') {
        // Query only enemies in the Spatial Grid cell around the projectile
        const candidateEnemies = this.enemySpatialGrid.queryRadius(
          proj.x,
          proj.y,
          proj.radius + 48,
          this.projHitEnemiesBuf
        );
        let hit = false;
        for (let k = 0; k < candidateEnemies.length; k++) {
          const enemy = candidateEnemies[k];
          const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
          if (dist <= proj.radius + enemy.size) {
            this.applyPlayerDamageToEnemy(enemy, {
              id: 99,
              name: 'Spell Bolt',
              key: '',
              description: '',
              icon: '',
              baseDamage: proj.damage,
              school: proj.school,
              damageFlags: proj.flags,
              cooldownSec: 0,
              manaCost: 0,
              range: 0,
            });

            // If fire, trigger Inferno Burst AoE explosion + Scorch Crater + Embers
            if (proj.school === DamageSchool.Fire) {
              state.particles.push(
                {
                  x: proj.x,
                  y: proj.y,
                  vx: 0,
                  vy: 0,
                  color: '#f97316',
                  size: 62,
                  life: 0.7,
                  maxLife: 0.7,
                  kind: 'scorch',
                },
                {
                  x: proj.x,
                  y: proj.y,
                  vx: 0,
                  vy: 0,
                  color: '#fef08a',
                  size: 80,
                  life: 0.35,
                  maxLife: 0.35,
                  kind: 'shockwave',
                }
              );
              for (let e = 0; e < 12; e++) {
                const ea = (e / 12) * Math.PI * 2;
                state.particles.push({
                  x: proj.x,
                  y: proj.y,
                  vx: Math.cos(ea) * (50 + Math.random() * 70),
                  vy: Math.sin(ea) * (50 + Math.random() * 70),
                  color: '#fb923c',
                  size: 4.5,
                  life: 0.45,
                  maxLife: 0.45,
                  kind: 'ember',
                });
              }

              const splashTargets = this.enemySpatialGrid.queryRadius(
                proj.x,
                proj.y,
                100,
                this.projHitEnemiesBuf
              );
              for (const splash of splashTargets) {
                if (splash.id !== enemy.id && Math.hypot(splash.x - proj.x, splash.y - proj.y) <= 80) {
                  this.applyPlayerDamageToEnemy(splash, {
                    id: 99,
                    name: 'Fire Splash',
                    key: '',
                    description: '',
                    icon: '',
                    baseDamage: proj.damage * 0.6,
                    school: DamageSchool.Fire,
                    damageFlags: proj.flags,
                    cooldownSec: 0,
                    manaCost: 0,
                    range: 0,
                  });
                }
              }
            }

            hit = true;
            break;
          }
        }
        if (hit && !proj.isPiercing) {
          state.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy projectile hitting player
        const dist = Math.hypot(state.player.x - proj.x, state.player.y - proj.y);
        if (dist <= proj.radius + 16) {
          this.applyEnemyDamageToPlayer(proj.damage, proj.school);
          state.projectiles.splice(i, 1);
          continue;
        }
      }

      if (proj.rangeLeft <= 0) {
        state.projectiles.splice(i, 1);
      }
    }

    // 6. Loot Magnet / Pickup
    for (let i = state.lootDrops.length - 1; i >= 0; i--) {
      const drop = state.lootDrops[i];
      const dist = Math.hypot(state.player.x - drop.x, state.player.y - drop.y);

      // Magnet pull when close
      if (dist < 90) {
        drop.x += ((state.player.x - drop.x) / dist) * 180 * dt;
        drop.y += ((state.player.y - drop.y) / dist) * 180 * dt;
      }

      if (dist < 26) {
        // Try pick up into inventory
        const def = getItemDef(drop.item.itemDefId);
        if (this.addToInventory(drop.item)) {
          sound.playPotion();
          this.addCombatLog(`Picked up ${def?.name || 'Item'}!`, 'loot');
          state.lootDrops.splice(i, 1);
        }
      }
    }

    // 7. Chest interaction
    if (state.currentZone === 'dungeon' && state.dungeon) {
      for (let cIdx = state.dungeon.chestLocations.length - 1; cIdx >= 0; cIdx--) {
        const chestPos = state.dungeon.chestLocations[cIdx];
        const distToChest = Math.hypot(state.player.x - chestPos.x, state.player.y - chestPos.y);
        if (distToChest < 48) {
          const ct = state.dungeon.map.worldToTile(chestPos.x, chestPos.y);
          state.dungeon.map.set(ct.x, ct.y, TileType.Floor);
          sound.playLootDrop();
          const drops = rollLoot('chest', undefined, state.currentFloor);
          for (const d of drops) {
            state.lootDrops.push({
              id: `chest-${this.nextEntityId++}`,
              x: chestPos.x + (Math.random() - 0.5) * 40,
              y: chestPos.y + (Math.random() - 0.5) * 40,
              item: d,
              creationTime: Date.now(),
            });
          }
          this.addCombatLog('Opened an Ancient Treasure Chest!', 'loot');
          state.dungeon.chestLocations.splice(cIdx, 1);
        }
      }
    }

    // 8. Exit Portal interaction (walking onto portal tile after clearing floor)
    if (state.currentZone === 'dungeon' && state.dungeon?.exitTile) {
      const exitPos = state.dungeon.map.tileToWorldCenter(
        state.dungeon.exitTile.x,
        state.dungeon.exitTile.y
      );
      const distToExit = Math.hypot(state.player.x - exitPos.x, state.player.y - exitPos.y);
      if (distToExit < 30 && state.floorCleared) {
        if (state.currentFloor >= 10) {
          state.isVictory = true;
          this.addCombatLog('👑 YOU HAVE CONQUERED THE ABYSS! SUPREME VICTORY!', 'system');
        } else {
          sound.playPortal();
          this.advanceToNextFloor();
        }
      }
    }

    // 8.5 Update Ground Warning Telegraphs
    for (let t = state.telegraphs.length - 1; t >= 0; t--) {
      const tele = state.telegraphs[t];
      tele.duration -= dt;
      if (tele.duration <= 0) {
        // DETONATE!
        state.screenShake = 10;
        sound.playHit(true);

        // Explosion particles
        for (let p = 0; p < 24; p++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 160 + 40;
          state.particles.push({
            x: tele.x,
            y: tele.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#ef4444',
            size: Math.random() * 4 + 2,
            life: 0.45,
            maxLife: 0.45,
          });
        }

        // Damage player if in detonation radius
        const dist = Math.hypot(state.player.x - tele.x, state.player.y - tele.y);
        if (dist <= tele.radius) {
          this.applyEnemyDamageToPlayer(tele.damage, tele.school);
          this.addCombatLog('Struck by Boss Ground Rupture!', 'damage');
        }

        state.telegraphs.splice(t, 1);
      }
    }

    // 8.6 Decay Screen Shake
    if (state.screenShake > 0) {
      state.screenShake = Math.max(0, state.screenShake - dt * 25);
    }

    // 9. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // 10. Update Floating Combat Texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const fct = state.floatingTexts[i];
      fct.lifetime -= dt;
      if (fct.lifetime <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }
  }

  private enemyAttack(enemy: EnemyEntity) {
    const state = this.state;
    const px = state.player.x;
    const py = state.player.y;
    const angle = Math.atan2(py - enemy.y, px - enemy.x);

    if (
      enemy.archetype === 'skeleton_warrior' ||
      enemy.archetype === 'shadow_stalker' ||
      enemy.archetype === 'abyssal_brute' ||
      enemy.archetype === 'dungeon_lord'
    ) {
      sound.playSwing();
      if (enemy.archetype === 'abyssal_brute' || enemy.archetype === 'dungeon_lord') {
        state.screenShake = Math.max(state.screenShake, 4);
      }
      // Vampiric elite modifier heals enemy on hit
      if (enemy.eliteModifier === 'Vampiric') {
        enemy.health = Math.min(enemy.maxHealth, enemy.health + Math.round(enemy.attackPower * 0.35));
      }
      this.applyEnemyDamageToPlayer(enemy.attackPower, DamageSchool.Physical);
    } else if (enemy.archetype === 'goblin_archer') {
      // Shoot arrow
      state.projectiles.push({
        id: `arrow-${this.nextEntityId++}`,
        sourceId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 280,
        vy: Math.sin(angle) * 280,
        speed: 280,
        damage: enemy.attackPower,
        school: DamageSchool.Physical,
        flags: 0,
        radius: 4,
        rangeLeft: 240,
        color: '#facc15',
      });
    } else if (enemy.archetype === 'necromancer') {
      // Cast shadow orb
      sound.playFrost();
      state.projectiles.push({
        id: `shadow-${this.nextEntityId++}`,
        sourceId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        speed: 220,
        damage: enemy.attackPower,
        school: DamageSchool.Shadow,
        flags: 0,
        radius: 8,
        rangeLeft: 260,
        color: '#a855f7',
      });
    }
  }

  private applyEnemyDamageToPlayer(baseDamage: number, school: DamageSchool) {
    const state = this.state;
    const calc = resolveDamagePipeline({
      baseAmount: baseDamage,
      school,
      flags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
      attackerAttackPower: baseDamage,
      attackerSpellPower: baseDamage,
      attackerCritChance: 5,
      attackerCritMultiplier: 150,
      targetArmor: state.playerStats.calculated[StatType.Armor],
      targetEvasion: state.playerStats.calculated[StatType.Evasion],
    });

    if (calc.isEvaded) {
      state.floatingTexts.push({
        id: `evade-${this.nextEntityId++}`,
        text: 'Evaded!',
        x: state.player.x,
        y: state.player.y,
        color: '#94a3b8',
        isCrit: false,
        lifetime: 0.8,
        maxLifetime: 0.8,
      });
      return;
    }

    let finalDamage = calc.damage;
    if (state.player.statusEffects.some((e) => e.name === 'Iron Bulwark' || e.name === 'Bone Armor')) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.6));
    }

    state.playerStats.health -= finalDamage;
    sound.playHit(false);

    state.floatingTexts.push({
      id: `p-hit-${this.nextEntityId++}`,
      text: `-${finalDamage}`,
      x: state.player.x,
      y: state.player.y,
      color: '#ef4444',
      isCrit: calc.isCrit,
      lifetime: 0.9,
      maxLifetime: 0.9,
    });

    if (state.playerStats.health <= 0) {
      state.playerStats.health = 0;
      state.isGameOver = true;
      this.addCombatLog('You succumbed to the dungeon horrors... Game Over.', 'system');
    }
  }

  public advanceToNextFloor() {
    const nextFloor = this.state.currentFloor + 1;
    const prevStats = this.state.playerStats;
    const prevEquip = this.state.equipment;
    const prevInv = this.state.inventory;

    const newDungeon = generateDungeonLevel(nextFloor);
    this.state.currentFloor = nextFloor;
    this.state.dungeon = newDungeon;
    this.state.player.x = newDungeon.playerSpawn.x;
    this.state.player.y = newDungeon.playerSpawn.y;
    this.camera.x = ((newDungeon.playerSpawn.x - newDungeon.playerSpawn.y) / 64) * 32;
    this.camera.y = ((newDungeon.playerSpawn.x + newDungeon.playerSpawn.y) / 64) * 16;
    this.state.floorCleared = false;
    this.state.player.statusEffects = [];
    this.state.telegraphs = [];
    this.state.screenShake = 0;
    this.state.enemies = [];
    this.state.projectiles = [];
    this.state.lootDrops = [];
    this.state.particles = [];
    this.state.floatingTexts = [];
    this.state.equipment = prevEquip;
    this.state.inventory = prevInv;
    this.state.playerStats = prevStats;

    this.spawnFloorEnemies(this.state, newDungeon, nextFloor);
    this.autoSave();
    this.addCombatLog(`Descended into Floor ${nextFloor}! Be on your guard!`, 'system');
  }

  public useItem(index: number) {
    const state = this.state;
    const item = state.inventory[index];
    if (!item) return;

    const def = getItemDef(item.itemDefId);
    if (!def) return;

    if (def.slot !== EquipSlot.None) {
      // Equip item
      const currentEquipped = state.equipment[def.slot];
      state.equipment[def.slot] = item;
      state.inventory[index] = currentEquipped; // Swap or null
      this.recalculatePlayerStats();
      this.addCombatLog(`Equipped ${def.name}.`, 'system');
      sound.playPotion();
      this.autoSave();
    } else {
      // Consumable
      if (def.id === 10) {
        // Health Potion (+50 HP)
        const maxHp = state.playerStats.calculated[StatType.MaxHealth];
        state.playerStats.health = Math.min(maxHp, state.playerStats.health + 50);
        sound.playPotion();
        this.addCombatLog('Consumed Health Elixir (+50 HP).', 'heal');
      } else if (def.id === 26) {
        // Greater Health Potion (+140 HP)
        const maxHp = state.playerStats.calculated[StatType.MaxHealth];
        state.playerStats.health = Math.min(maxHp, state.playerStats.health + 140);
        sound.playPotion();
        this.addCombatLog('Consumed Greater Health Potion (+140 HP).', 'heal');
      } else if (def.id === 11) {
        // Mana Flask (+40 Mana)
        const maxMana = state.playerStats.calculated[StatType.MaxMana];
        state.playerStats.mana = Math.min(maxMana, state.playerStats.mana + 40);
        sound.playPotion();
        this.addCombatLog('Consumed Mana Flask (+40 MP).', 'heal');
      } else if (def.id === 27) {
        // Greater Mana Flask (+100 Mana)
        const maxMana = state.playerStats.calculated[StatType.MaxMana];
        state.playerStats.mana = Math.min(maxMana, state.playerStats.mana + 100);
        sound.playPotion();
        this.addCombatLog('Consumed Greater Mana Flask (+100 MP).', 'heal');
      } else if (def.id === 14) {
        // Elixir of Regeneration (HoT: heals 15 HP/sec for 6 sec)
        sound.playPotion();
        state.player.statusEffects.push({
          id: `regen-${this.nextEntityId++}`,
          name: 'Regeneration',
          kind: 'hot',
          healPerTick: 15,
          totalDuration: 6.0,
          durationLeft: 6.0,
          tickTimer: 0,
          icon: 'Sparkles',
          color: '#22c55e',
        });
        this.addCombatLog('Consumed Elixir of Regeneration (+15 HP/s for 6s).', 'heal');
      }

      if (item.count > 1) {
        item.count--;
      } else {
        state.inventory[index] = null;
      }
      this.autoSave();
    }
  }

  public unequipItem(slot: EquipSlot) {
    const state = this.state;
    const equipped = state.equipment[slot];
    if (!equipped) return;

    if (this.addToInventory(equipped)) {
      state.equipment[slot] = null;
      this.recalculatePlayerStats();
      const def = getItemDef(equipped.itemDefId);
      this.addCombatLog(`Unequipped ${def?.name || 'gear'}.`, 'system');
      this.autoSave();
    } else {
      this.addCombatLog('Inventory full!', 'system');
    }
  }

  public allocateAttribute(attr: AttributeType) {
    if (this.state.unallocatedStatPoints <= 0) return;
    this.state.unallocatedStatPoints--;
    this.state.playerStats.attributes[attr]++;
    this.recalculatePlayerStats();
    this.addCombatLog(`Increased ${AttributeType[attr]} to ${this.state.playerStats.attributes[attr]}!`, 'system');
    this.autoSave();
  }

  public recalculatePlayerStats() {
    const prevMaxHp = this.state.playerStats.calculated[StatType.MaxHealth];
    const prevMaxMp = this.state.playerStats.calculated[StatType.MaxMana];

    this.state.playerStats.calculated = computeTotalStats(
      this.state.playerStats.attributes,
      this.state.equipment
    );

    const newMaxHp = this.state.playerStats.calculated[StatType.MaxHealth];
    const newMaxMp = this.state.playerStats.calculated[StatType.MaxMana];

    // Maintain ratio or add difference
    if (newMaxHp > prevMaxHp) {
      this.state.playerStats.health += newMaxHp - prevMaxHp;
    }
    if (newMaxMp > prevMaxMp) {
      this.state.playerStats.mana += newMaxMp - prevMaxMp;
    }
    this.state.playerStats.health = Math.min(this.state.playerStats.health, newMaxHp);
    this.state.playerStats.mana = Math.min(this.state.playerStats.mana, newMaxMp);
  }

  public addToInventory(stack: ItemStack): boolean {
    const inv = this.state.inventory;

    // Check stacking for consumables
    const def = getItemDef(stack.itemDefId);
    if (def && def.slot === EquipSlot.None) {
      for (let i = 0; i < inv.length; i++) {
        const slot = inv[i];
        if (slot && slot.itemDefId === stack.itemDefId) {
          slot.count += stack.count;
          return true;
        }
      }
    }

    // Find empty slot
    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) {
        inv[i] = stack;
        return true;
      }
    }
    return false;
  }

  public addCombatLog(text: string, type: CombatLogEntry['type']) {
    this.state.combatLogs.unshift({
      id: `log-${this.nextEntityId++}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    });
    if (this.state.combatLogs.length > 50) {
      this.state.combatLogs.pop();
    }
  }
}
