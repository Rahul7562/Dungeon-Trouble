export type u8 = number;
export type u32 = number;
export type i32 = number;
export type f32 = number;

export enum AttributeType {
  STR = 0,
  DEX = 1,
  INT = 2,
  VIT = 3,
}

export enum StatType {
  MaxHealth = 0,
  MaxMana = 1,
  AttackPower = 2,
  SpellPower = 3,
  Armor = 4,
  Evasion = 5,
  CritChance = 6,
  CritMultiplier = 7,
  MoveSpeed = 8,
  CooldownReduction = 9,
}

export enum DamageSchool {
  Physical = 0,
  Fire = 1,
  Frost = 2,
  Arcane = 3,
  Shadow = 4,
}

export enum ItemRarity {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Epic = 3,
  Legendary = 4,
}

export enum EquipSlot {
  None = 0,
  Head = 1,
  Chest = 2,
  Legs = 3,
  Boots = 4,
  MainHand = 5,
  OffHand = 6,
  Ring = 7,
  Amulet = 8,
}

export enum ModifierOp {
  Flat = 0,
  PercentAdd = 1,
  PercentMult = 2,
  Percent = 1, // alias for backwards compatibility
}

export interface StatModifier {
  sourceId?: number;
  stat: StatType;
  op: ModifierOp;
  value: number;
  durationTicks?: number; // -1 = permanent
}

export interface StatSheet {
  attributes: Record<AttributeType, number>;
  modifiers: StatModifier[];
  cachedStats: Record<StatType, number>;
  isDirty: boolean;
}

export interface ItemDef {
  id: number;
  name: string;
  rarity?: ItemRarity;
  slot: EquipSlot;
  description?: string;
  icon?: string;
  maxStack?: number;
  equipModifiers?: StatModifier[];
}

export interface ItemStack {
  instanceId?: string;
  itemDefId: number;
  defId?: number; // alias for C++ tests
  count: number;
  upgradeLevel?: number;
}

export type EquipmentState = Record<EquipSlot, ItemStack | null>;

export enum TileType {
  Empty = 0,
  Floor = 1,
  Wall = 2,
  Pit = 3,
  Water = 4,
  Lava = 5,
  Exit = 6,
  Chest = 7,
}

export interface TileCoord {
  x: number;
  y: number;
}

export interface WorldCoord {
  x: number;
  y: number;
}

export interface AbilityDef {
  id: number;
  name: string;
  key?: string;
  description?: string;
  icon?: string;
  baseDamage: number;
  school: DamageSchool;
  damageFlags: number; // 1: CanCrit, 2: IgnoreArmor, 4: TrueDamage
  cooldownTicks?: number;
  cooldownSec?: number;
  manaCost: number;
  range: number;
  radius?: number;
  appliesStatusId?: number | string;
}

export enum StatusKind {
  DamageOverTime = 0,
  HealOverTime = 1,
  Stun = 2,
  StatBuff = 3,
}

export interface StatusEffectDef {
  id: number;
  name: string;
  kind: StatusKind;
  magnitudePerTick?: number;
  school?: DamageSchool;
  durationTicks: number;
  tickInterval: number;
  statModifier?: StatModifier;
}

export enum HitShapeKind {
  Circle = 0,
  AABB = 1,
}

export interface HitShape {
  kind: HitShapeKind;
  x: number;
  y: number;
  radius: number;
  halfW: number;
  halfH: number;
}

export interface DamageEvent {
  source: any;
  target: any;
  baseAmount: number;
  school: DamageSchool;
  flags: number;
}

export interface DamageAppliedEvent {
  source: any;
  target: any;
  finalAmount: number;
  wasCrit: boolean;
}

export interface EntityDiedEvent {
  entity: any;
  killer?: any;
}

export interface AbilityCastEvent {
  caster: any;
  abilityId: number;
  target: any;
}

export enum SpawnKind {
  PlayerStart = 0,
  Enemy = 1,
  Boss = 2,
  Chest = 3,
}

export interface SpawnPoint {
  id: number;
  x: number;
  y: number;
  kind: SpawnKind;
  refId: number;
}

export interface ZoneDef {
  id: number;
  name: string;
  tiles: any;
  spawns: SpawnPoint[];
}

export interface AbilityCooldown {
  current: number;
  max: number;
}

export interface StatusEffectInstance {
  id: string;
  name: string;
  durationLeft: number;
  totalDuration: number;
  icon: string;
  color: string;
  tickTimer: number;
  kind?: 'dot' | 'hot' | 'buff' | 'stun';
  damagePerTick?: number;
  healPerTick?: number;
  school?: DamageSchool;
  speedMultiplier?: number;
  isStunned?: boolean;
  statModifier?: StatModifier;
}

export type EnemyArchetype =
  | 'skeleton_warrior'
  | 'shadow_stalker'
  | 'goblin_archer'
  | 'abyssal_brute'
  | 'necromancer'
  | 'dungeon_lord';

export type EnemyAIState =
  | 'idle'
  | 'patrol'
  | 'pursuit'
  | 'positioning'
  | 'windup'
  | 'attack'
  | 'recovery'
  | 'reposition'
  | 'stunned'
  | 'dead';

export type DungeonThemeId =
  | 'forgotten_catacombs'
  | 'frozen_depths'
  | 'corrupted_temple'
  | 'ember_crypt';

export type DungeonPropKind =
  | 'torch'
  | 'pillar'
  | 'sarcophagus'
  | 'brazier'
  | 'crystal'
  | 'altar'
  | 'banner'
  | 'rubble'
  | 'barrel'
  | 'crate'
  | 'bones'
  | 'chains'
  | 'statue'
  | 'cobweb'
  | 'arch'
  | 'bed'
  | 'table'
  | 'chair'
  | 'bookshelf'
  | 'fireplace'
  | 'rug'
  | 'anvil'
  | 'weapon_rack'
  | 'alchemy_table'
  | 'well'
  | 'street_lantern'
  | 'market_stall'
  | 'bench';

export interface DungeonProp {
  id: string;
  kind: DungeonPropKind;
  x: number;
  y: number;
  solid: boolean;
  radius: number;
  variant?: number;
  lightColor?: string;
  lightRadius?: number;
  buildingId?: string;
  label?: string;
}

export interface BossTelegraph {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  maxDuration: number;
  damage: number;
  school: DamageSchool;
  shape?: 'circle' | 'ring' | 'cone' | 'line';
  angle?: number;
  sourceName?: string;
}

export interface FloatingCombatText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  isCrit: boolean;
  lifetime: number;
  maxLifetime: number;
}

export interface Particle {
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  color: string;
  secondaryColor?: string;
  size: number;
  life: number;
  maxLife: number;
  kind?:
    | 'spark'
    | 'smoke'
    | 'rune'
    | 'slash'
    | 'ring'
    | 'shard'
    | 'ember'
    | 'frost_nova'
    | 'scorch'
    | 'afterimage'
    | 'blood'
    | 'bone_frag'
    | 'shockwave';
  angle?: number;
  scale?: number;
  playerClass?: string;
}

export interface LootDropEntity {
  id: string;
  x: number;
  y: number;
  item: ItemStack;
  creationTime: number;
  pickedUp?: boolean;
}

export interface Projectile {
  id: string;
  sourceId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  school: DamageSchool;
  flags: number;
  radius: number;
  rangeLeft: number;
  color: string;
  isPiercing?: boolean;
  hitEntityIds?: string[];
  appliesStatus?: string;
}

export interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  name: string;
  x: number;
  y: number;
  z: number;
  spawnX?: number;
  spawnY?: number;
  targetX?: number;
  targetY?: number;
  vx: number;
  vy: number;
  knockbackVx?: number;
  knockbackVy?: number;
  health: number;
  maxHealth: number;
  attackPower: number;
  armor: number;
  moveSpeed: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  windupTimer?: number;
  maxWindupTimer?: number;
  recoveryTimer?: number;
  aiState?: EnemyAIState;
  patrolTimer?: number;
  patrolAngle?: number;
  xpReward: number;
  color: string;
  size: number;
  facingAngle: number;
  statusEffects: StatusEffectInstance[];
  isHitFlashTimer: number;
  isElite?: boolean;
  eliteModifier?: 'Vampiric' | 'Molten' | 'Frozen' | 'Arcane' | 'Berserker';
  isDead?: boolean;
  rewardClaimed?: boolean;
  phase?: number;
  isEnraged?: boolean;
  specialAttackTimer?: number;
  summonTimer?: number;
  novaTimer?: number;
}

export interface PlayerStats {
  attributes: Record<AttributeType, number>;
  calculated: Record<StatType, number>;
  health: number;
  mana: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'damage' | 'heal' | 'loot' | 'system' | 'kill';
  timestamp: string;
}

export type CharacterClass = 'swordsman' | 'archer' | 'mage' | 'necromancer';
export type ZoneType = 'town' | 'dungeon';

export type NPCRole = 'elder' | 'healer' | 'storage' | 'shop' | 'blacksmith' | 'guide' | 'villager';

export interface NPCEntity {
  id: string;
  name: string;
  title: string;
  role: NPCRole;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  dialogue: string[];
  color: string;
  facingAngle: number;
  homePos?: WorldCoord;
  waypoints?: WorldCoord[];
  currentWaypointIdx?: number;
  targetX?: number;
  targetY?: number;
  moveSpeed?: number;
  waitTimer?: number;
  activityText?: string;
  activities?: string[];
  carriesLantern?: boolean;
}

export type TownRoofStyle =
  | 'terracotta_tudor'
  | 'teal_slate_manor'
  | 'weathered_stone_inn'
  | 'rustic_cottage'
  | 'stone_keep';

export interface TownBuilding {
  id: string;
  name: string;
  subtitle?: string;
  roofStyle: TownRoofStyle;
  x: number;
  y: number;
  w: number;
  h: number;
  wing?: { x: number; y: number; w: number; h: number };
  doors: TileCoord[];
  windows: TileCoord[];
  hasTurret?: boolean;
  turretTile?: TileCoord;
  chimneyTile?: TileCoord;
  hasTimberGallery?: boolean;
  floorStyle?: 'oak_planks' | 'stone_flag' | 'royal_carpet';
}

export type TimeOfDayPhase = 'Dawn' | 'Morning' | 'Afternoon' | 'Evening' | 'Dusk' | 'Night';

export interface DaylightState {
  timeHours: number;
  formattedTime: string;
  phase: TimeOfDayPhase;
  ambientDarkness: number;
  skyTintColor: string;
  skyTintIntensity: number;
  sunAngleX: number;
  sunAngleY: number;
  shadowLength: number;
  isNightLightsOn: boolean;
  lanternIntensity?: number;
  shadowTintRgb?: [number, number, number];
  dayProgress: number;
}

export interface SummonEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attackPower: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  moveSpeed: number;
  durationLeft: number;
  maxDuration: number;
  targetId?: string;
  facingAngle: number;
  color: string;
}

export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

export type RenderQuality = 'high' | 'medium' | 'low';

export interface SavedGameState {
  version: number;
  playerName: string;
  selectedClass: CharacterClass;
  currentZone: ZoneType;
  currentFloor: number;
  highestFloorUnlocked: number;
  clearedFloors: number[];
  player: {
    x: number;
    y: number;
  };
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
  storage: (ItemStack | null)[];
  unallocatedStatPoints: number;
  worldTimeHours?: number;
  audioSettings?: AudioSettings;
  renderQuality?: RenderQuality;
  savedAt: string;
}

