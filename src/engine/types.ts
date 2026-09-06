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

export interface BossTelegraph {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  maxDuration: number;
  damage: number;
  school: DamageSchool;
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
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface LootDropEntity {
  id: string;
  x: number;
  y: number;
  item: ItemStack;
  creationTime: number;
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
}

export type EnemyArchetype = 'skeleton_warrior' | 'goblin_archer' | 'necromancer' | 'dungeon_lord';

export interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  name: string;
  x: number;
  y: number;
  z: number;
  targetX?: number;
  targetY?: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  attackPower: number;
  armor: number;
  moveSpeed: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  xpReward: number;
  color: string;
  size: number;
  facingAngle: number;
  statusEffects: StatusEffectInstance[];
  isHitFlashTimer: number;
  phase?: number;
  isEnraged?: boolean;
  specialAttackTimer?: number;
  summonTimer?: number;
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

export type NPCRole = 'elder' | 'healer' | 'storage' | 'shop' | 'blacksmith' | 'guide';

export interface NPCEntity {
  id: string;
  name: string;
  title: string;
  role: NPCRole;
  x: number;
  y: number;
  dialogue: string[];
  color: string;
  facingAngle: number;
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
  savedAt: string;
}
