import {
  CharacterClass,
  AttributeType,
  StatType,
  DamageSchool,
  EquipmentState,
  EquipSlot,
  ItemStack,
  AbilityDef,
} from './types';
import { DAMAGE_FLAGS } from './combat';
import { createItemStack } from './items';

export interface ClassDefinition {
  id: CharacterClass;
  name: string;
  title: string;
  role: string;
  description: string;
  playstyle: string;
  icon: string;
  color: string;
  accentColor: string;
  baseAttributes: Record<AttributeType, number>;
  getStartingEquipment: () => EquipmentState;
  getStartingInventory: () => (ItemStack | null)[];
  abilities: AbilityDef[];
}

export const CLASS_DEFINITIONS: Record<CharacterClass, ClassDefinition> = {
  swordsman: {
    id: 'swordsman',
    name: 'Swordsman',
    title: 'The Steel Vanguard',
    role: 'Melee / High Durability',
    description:
      'A heavily armored frontline champion trained in the art of the blade. Boasts high health, impenetrable armor, and punishing close-range cleaves.',
    playstyle: 'Get in close, cleave through swarms of monsters, and withstand heavy blows.',
    icon: 'Sword',
    color: '#e2e8f0',
    accentColor: '#f59e0b',
    baseAttributes: {
      [AttributeType.STR]: 14,
      [AttributeType.DEX]: 10,
      [AttributeType.INT]: 6,
      [AttributeType.VIT]: 14,
    },
    getStartingEquipment: () => ({
      [EquipSlot.None]: null,
      [EquipSlot.Head]: null,
      [EquipSlot.Chest]: createItemStack(2, 1), // Reinforced Iron Armor
      [EquipSlot.Legs]: null,
      [EquipSlot.Boots]: null,
      [EquipSlot.MainHand]: createItemStack(1, 1), // Rusty Shortsword
      [EquipSlot.OffHand]: createItemStack(7, 1), // Aegis of the Sun
      [EquipSlot.Ring]: null,
      [EquipSlot.Amulet]: null,
    }),
    getStartingInventory: () => {
      const inv: (ItemStack | null)[] = new Array(20).fill(null);
      inv[0] = createItemStack(10, 4); // 4 Health Elixirs
      inv[1] = createItemStack(11, 2); // 2 Mana Flasks
      return inv;
    },
    abilities: [
      {
        id: 101,
        name: 'Twin Slash',
        key: '1 / L-Click',
        description: 'A swift physical cleave cutting all foes in a wide frontal arc.',
        icon: 'Sword',
        baseDamage: 28,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 0.35,
        cooldownTicks: 10,
        manaCost: 0,
        range: 110,
        radius: 95,
      },
      {
        id: 102,
        name: 'Heavy Strike',
        key: '2 / Q',
        description: 'Brings down a crushing overhead blow that stuns and staggers the target.',
        icon: 'Hammer',
        baseDamage: 65,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 3.5,
        cooldownTicks: 105,
        manaCost: 15,
        range: 120,
        radius: 60,
      },
      {
        id: 103,
        name: 'Iron Bulwark',
        key: '3 / E',
        description: 'Fortifies armor and braces shields, absorbing incoming damage for 5 seconds.',
        icon: 'Shield',
        baseDamage: 0,
        school: DamageSchool.Physical,
        damageFlags: 0,
        cooldownSec: 8.0,
        cooldownTicks: 240,
        manaCost: 20,
        range: 0,
        radius: 0,
      },
      {
        id: 104,
        name: 'Whirlwind',
        key: 'Space / 4',
        description: 'Spins in a violent circle of steel, damaging all adjacent foes repeatedly.',
        icon: 'RotateCw',
        baseDamage: 45,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 4.0,
        cooldownTicks: 120,
        manaCost: 25,
        range: 0,
        radius: 140,
      },
    ],
  },

  archer: {
    id: 'archer',
    name: 'Archer',
    title: 'The Shadow Stalker',
    role: 'Ranged / High Mobility',
    description:
      'A master marksman with deadly precision. Excels at kiting foes from long distance, rapid piercing volleys, and evasive retreats.',
    playstyle: 'Keep your distance, dodge enemy strikes, and dispatch enemies with high critical hits.',
    icon: 'Crosshair',
    color: '#10b981',
    accentColor: '#34d399',
    baseAttributes: {
      [AttributeType.STR]: 9,
      [AttributeType.DEX]: 16,
      [AttributeType.INT]: 8,
      [AttributeType.VIT]: 11,
    },
    getStartingEquipment: () => ({
      [EquipSlot.None]: null,
      [EquipSlot.Head]: null,
      [EquipSlot.Chest]: createItemStack(23, 1), // Hunter's Leather Tunic
      [EquipSlot.Legs]: null,
      [EquipSlot.Boots]: createItemStack(3, 1), // Shadowrunner Boots
      [EquipSlot.MainHand]: createItemStack(15, 1), // Hunter's Recurve Bow
      [EquipSlot.OffHand]: createItemStack(19, 1), // Ranger's Quiver
      [EquipSlot.Ring]: null,
      [EquipSlot.Amulet]: null,
    }),
    getStartingInventory: () => {
      const inv: (ItemStack | null)[] = new Array(20).fill(null);
      inv[0] = createItemStack(10, 3); // 3 Health Elixirs
      inv[1] = createItemStack(11, 3); // 3 Mana Flasks
      return inv;
    },
    abilities: [
      {
        id: 201,
        name: 'Quick Shot',
        key: '1 / L-Click',
        description: 'Fires a swift aerodynamic arrow with high velocity.',
        icon: 'Crosshair',
        baseDamage: 24,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 0.3,
        cooldownTicks: 9,
        manaCost: 0,
        range: 340,
        radius: 8,
      },
      {
        id: 202,
        name: 'Multi-Shot',
        key: '2 / Q',
        description: 'Looses a volley of 5 piercing arrows in a frontal cone.',
        icon: 'Split',
        baseDamage: 38,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 2.8,
        cooldownTicks: 84,
        manaCost: 15,
        range: 300,
        radius: 12,
      },
      {
        id: 203,
        name: 'Rain of Arrows',
        key: '3 / E',
        description: 'Summons a lethal shower of arrows onto an area, pinning and damaging enemies.',
        icon: 'CloudRain',
        baseDamage: 50,
        school: DamageSchool.Physical,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 6.0,
        cooldownTicks: 180,
        manaCost: 25,
        range: 240,
        radius: 110,
      },
      {
        id: 204,
        name: 'Evasive Vault',
        key: 'Space / 4',
        description: 'Performs a swift acrobatic leap backward, gaining rapid movement speed.',
        icon: 'Wind',
        baseDamage: 12,
        school: DamageSchool.Physical,
        damageFlags: 0,
        cooldownSec: 2.2,
        cooldownTicks: 66,
        manaCost: 10,
        range: 220,
        radius: 60,
      },
    ],
  },

  mage: {
    id: 'mage',
    name: 'Mage',
    title: 'The Arcane Elementalist',
    role: 'Magic / High Burst AOE',
    description:
      'A scholar of primal fire, frost, and arcane force. Capable of decimating entire rooms with explosive spells and freezing crowd control.',
    playstyle: 'Unleash devastating fireballs and frost spells while managing your mana pool.',
    icon: 'Sparkles',
    color: '#0ea5e9',
    accentColor: '#38bdf8',
    baseAttributes: {
      [AttributeType.STR]: 6,
      [AttributeType.DEX]: 8,
      [AttributeType.INT]: 18,
      [AttributeType.VIT]: 10,
    },
    getStartingEquipment: () => ({
      [EquipSlot.None]: null,
      [EquipSlot.Head]: null,
      [EquipSlot.Chest]: createItemStack(24, 1), // Silk Robes of the Magus
      [EquipSlot.Legs]: null,
      [EquipSlot.Boots]: null,
      [EquipSlot.MainHand]: createItemStack(16, 1), // Apprentice Arcane Staff
      [EquipSlot.OffHand]: createItemStack(20, 1), // Spell Tome of Sparks
      [EquipSlot.Ring]: null,
      [EquipSlot.Amulet]: null,
    }),
    getStartingInventory: () => {
      const inv: (ItemStack | null)[] = new Array(20).fill(null);
      inv[0] = createItemStack(10, 2); // 2 Health Elixirs
      inv[1] = createItemStack(11, 5); // 5 Mana Flasks
      return inv;
    },
    abilities: [
      {
        id: 301,
        name: 'Arcane Bolt',
        key: '1 / L-Click',
        description: 'Launches a pulsing bolt of raw arcane energy.',
        icon: 'Zap',
        baseDamage: 22,
        school: DamageSchool.Arcane,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT | DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
        cooldownSec: 0.35,
        cooldownTicks: 10,
        manaCost: 0,
        range: 320,
        radius: 10,
      },
      {
        id: 302,
        name: 'Fireball',
        key: '2 / Q',
        description: 'Hurls an explosive sphere of fire that detonates on contact, scorching foes.',
        icon: 'Flame',
        baseDamage: 65,
        school: DamageSchool.Fire,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 3.2,
        cooldownTicks: 96,
        manaCost: 20,
        range: 280,
        radius: 110,
      },
      {
        id: 303,
        name: 'Frost Nova',
        key: '3 / E',
        description: 'Explodes an icy shockwave freezing and chilling all nearby monsters.',
        icon: 'Snowflake',
        baseDamage: 45,
        school: DamageSchool.Frost,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 5.5,
        cooldownTicks: 165,
        manaCost: 25,
        range: 0,
        radius: 160,
      },
      {
        id: 304,
        name: 'Aether Blink',
        key: 'Space / 4',
        description: 'Instantly teleports through ethereal space, leaving an arcane explosion.',
        icon: 'Sparkles',
        baseDamage: 20,
        school: DamageSchool.Arcane,
        damageFlags: DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
        cooldownSec: 2.4,
        cooldownTicks: 72,
        manaCost: 15,
        range: 220,
        radius: 75,
      },
    ],
  },

  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    title: 'The Lord of Shadows',
    role: 'Dark Magic / Summoning & Drain',
    description:
      'A wielder of dark occult arts who bends mortality. Siphons life essence from foes and summons skeletal minions to fight alongside them.',
    playstyle: 'Drain enemy vitality to sustain yourself and summon loyal undead thralls.',
    icon: 'Skull',
    color: '#a855f7',
    accentColor: '#c084fc',
    baseAttributes: {
      [AttributeType.STR]: 8,
      [AttributeType.DEX]: 9,
      [AttributeType.INT]: 15,
      [AttributeType.VIT]: 12,
    },
    getStartingEquipment: () => ({
      [EquipSlot.None]: null,
      [EquipSlot.Head]: null,
      [EquipSlot.Chest]: createItemStack(25, 1), // Deathknight's Shroud
      [EquipSlot.Legs]: null,
      [EquipSlot.Boots]: null,
      [EquipSlot.MainHand]: createItemStack(17, 1), // Bone Wand of Decay
      [EquipSlot.OffHand]: createItemStack(21, 1), // Skull of the Fallen
      [EquipSlot.Ring]: null,
      [EquipSlot.Amulet]: null,
    }),
    getStartingInventory: () => {
      const inv: (ItemStack | null)[] = new Array(20).fill(null);
      inv[0] = createItemStack(10, 3);
      inv[1] = createItemStack(11, 4);
      return inv;
    },
    abilities: [
      {
        id: 401,
        name: 'Shadow Bolt',
        key: '1 / L-Click',
        description: 'Launches a screaming shadowy projectile that penetrates enemy armor.',
        icon: 'Ghost',
        baseDamage: 25,
        school: DamageSchool.Shadow,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT | DAMAGE_FLAGS.FLAG_IGNORE_ARMOR,
        cooldownSec: 0.35,
        cooldownTicks: 10,
        manaCost: 0,
        range: 300,
        radius: 9,
      },
      {
        id: 402,
        name: 'Life Drain',
        key: '2 / Q',
        description: 'Channels a necrotic conduit that siphons enemy health directly to heal you.',
        icon: 'HeartCrack',
        baseDamage: 40,
        school: DamageSchool.Shadow,
        damageFlags: DAMAGE_FLAGS.FLAG_TRUE_DAMAGE,
        cooldownSec: 4.0,
        cooldownTicks: 120,
        manaCost: 18,
        range: 220,
        radius: 40,
      },
      {
        id: 403,
        name: 'Summon Skeleton',
        key: '3 / E',
        description: 'Raises a faithful Skeletal Warrior from the underworld to attack nearby enemies.',
        icon: 'Skull',
        baseDamage: 0,
        school: DamageSchool.Shadow,
        damageFlags: 0,
        cooldownSec: 8.0,
        cooldownTicks: 240,
        manaCost: 30,
        range: 0,
        radius: 0,
      },
      {
        id: 404,
        name: 'Bone Armor',
        key: 'Space / 4',
        description: 'Encircles you with revolving bone shards that deflect damage and damage nearby foes.',
        icon: 'ShieldAlert',
        baseDamage: 25,
        school: DamageSchool.Shadow,
        damageFlags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
        cooldownSec: 4.5,
        cooldownTicks: 135,
        manaCost: 20,
        range: 0,
        radius: 90,
      },
    ],
  },
};

export function getClassDefinition(characterClass: CharacterClass = 'swordsman'): ClassDefinition {
  return CLASS_DEFINITIONS[characterClass] || CLASS_DEFINITIONS.swordsman;
}
