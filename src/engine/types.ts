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
  Percent = 1,
}

export interface StatModifier {
  stat: StatType;
  op: ModifierOp;
  value: number;
}

export interface ItemDef {
  id: number;
  name: string;
  rarity: ItemRarity;
  slot: EquipSlot;
  description: string;
  icon: string;
  equipModifiers: StatModifier[];
}

export interface ItemStack {
  instanceId: string;
  itemDefId: number;
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
  key: string;
  description: string;
  icon: string;
  baseDamage: number;
  school: DamageSchool;
  damageFlags: number; // 1: CanCrit, 2: IgnoreArmor, 4: TrueDamage
  cooldownSec: number;
  manaCost: number;
  range: number;
  radius?: number;
  appliesStatusId?: string;
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
  damagePerTick?: number;
  school?: DamageSchool;
  speedMultiplier?: number;
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
