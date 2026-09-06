import { TileType, TileMap, WorldCoord } from './world';
import { NPCEntity } from './types';

export interface GeneratedTown {
  map: TileMap;
  playerSpawn: WorldCoord;
  fountainPos: WorldCoord;
  dungeonPortalPos: WorldCoord;
  npcs: NPCEntity[];
}

export function generateTownLevel(): GeneratedTown {
  // 32 x 32 town tile map
  const width = 32;
  const height = 32;
  const tileSize = 64;
  const map = new TileMap(width, height, tileSize, 0, 0);

  // Default all tiles to floor / grass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Outer perimeter wall / fences
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map.set(x, y, TileType.Wall);
      } else {
        map.set(x, y, TileType.Floor);
      }
    }
  }

  // Carve Cobblestone Crossroads:
  // North-South main thoroughfare from y=2 to y=30 at x=15, 16
  // East-West main thoroughfare from x=2 to x=30 at y=15, 16
  // (In isometric rendering, Floor tile with cobblestone pattern is used)

  // Houses / Building Footprints:
  // 1. Elder's Sanctuary (North-West: x: 5..10, y: 5..9)
  for (let x = 5; x <= 10; x++) {
    for (let y = 5; y <= 9; y++) {
      if (x === 5 || x === 10 || y === 5 || y === 9) {
        if (!(x === 8 && y === 9)) {
          // Leave door open at x=8, y=9
          map.set(x, y, TileType.Wall);
        }
      }
    }
  }

  // 2. Blacksmith Forge (South-East: x: 21..26, y: 21..25)
  for (let x = 21; x <= 26; x++) {
    for (let y = 21; y <= 25; y++) {
      if (x === 21 || x === 26 || y === 21 || y === 25) {
        if (!(x === 23 && y === 21)) {
          // Door at x=23, y=21
          map.set(x, y, TileType.Wall);
        }
      }
    }
  }

  // 3. Vault & Storage Repository (South-West: x: 5..10, y: 21..25)
  for (let x = 5; x <= 10; x++) {
    for (let y = 21; y <= 25; y++) {
      if (x === 5 || x === 10 || y === 21 || y === 25) {
        if (!(x === 8 && y === 21)) {
          map.set(x, y, TileType.Wall);
        }
      }
    }
  }

  // 4. Healer's Chapel (North-East: x: 21..26, y: 5..9)
  for (let x = 21; x <= 26; x++) {
    for (let y = 5; y <= 9; y++) {
      if (x === 21 || x === 26 || y === 5 || y === 9) {
        if (!(x === 23 && y === 9)) {
          map.set(x, y, TileType.Wall);
        }
      }
    }
  }

  // Central Fountain: 3x3 circle at center (15, 15) to (17, 17)
  // Center tile is decorative fountain water
  map.set(16, 16, TileType.Water);
  const fountainPos = map.tileToWorldCenter(16, 16);

  // Player spawns near the fountain in town center
  const playerSpawn = map.tileToWorldCenter(16, 18);

  // Dungeon Gate Portal at North (x=16, y=2)
  map.set(16, 2, TileType.Exit);
  const dungeonPortalPos = map.tileToWorldCenter(16, 2);

  // Trees and vegetation clusters along perimeter
  const treeTiles = [
    { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 },
    { x: 27, y: 3 }, { x: 28, y: 3 }, { x: 28, y: 4 },
    { x: 3, y: 27 }, { x: 3, y: 28 }, { x: 4, y: 28 },
    { x: 27, y: 27 }, { x: 28, y: 28 }, { x: 27, y: 28 },
    { x: 12, y: 7 }, { x: 19, y: 7 },
    { x: 12, y: 24 }, { x: 19, y: 24 },
  ];
  for (const t of treeTiles) {
    map.set(t.x, t.y, TileType.Wall); // Tree trunks block movement
  }

  // NPCs stationed around town
  const npcs: NPCEntity[] = [
    {
      id: 'npc-elder',
      name: 'Elder Eldrin',
      title: 'Town Elder',
      role: 'elder',
      x: map.tileToWorldCenter(14, 15).x,
      y: map.tileToWorldCenter(14, 15).y,
      dialogue: [
        'Welcome to Town-1, {PLAYERNAME}. Our peaceful haven stands beside an ominous rift.',
        'Below our quiet streets lies a perilous labyrinth of 10 treacherous dungeon floors.',
        'Vile beasts and 3 ancient lords rule the deep. The deeper you delve, the deadlier they become.',
        'Speak to Sister Althea to tend your wounds, visit Brom to store your precious loot, and consult Torvald to temper your blades.',
        'May the light guide your blade, brave {CLASS}. Conquer Floor 10 and purge the evil from our lands!',
      ],
      color: '#38bdf8',
      facingAngle: 0.8,
    },
    {
      id: 'npc-healer',
      name: 'Sister Althea',
      title: 'High Cleric',
      role: 'healer',
      x: map.tileToWorldCenter(23, 11).x,
      y: map.tileToWorldCenter(23, 11).y,
      dialogue: [
        'Greetings, child of fate. The dark miasma of the dungeon takes a heavy toll.',
        'Step forward and let the sacred spring wash away your exhaustion and cleanse your spirits.',
        'I have fully restored your Health and Mana reserves. Go forth unharmed!',
      ],
      color: '#4ade80',
      facingAngle: 2.2,
    },
    {
      id: 'npc-storage',
      name: 'Brom the Keeper',
      title: 'Vault Warden',
      role: 'storage',
      x: map.tileToWorldCenter(8, 19).x,
      y: map.tileToWorldCenter(8, 19).y,
      dialogue: [
        'Hail, {PLAYERNAME}! Carrying too much gear into the crypts is a quick way to an early grave.',
        'Leave your excess weapons, potions, and legendary relics in my vault. What you deposit here will remain safe forever across your adventures.',
      ],
      color: '#fbbf24',
      facingAngle: -0.5,
    },
    {
      id: 'npc-shop',
      name: 'Garrick the Merchant',
      title: 'General Goods & Trinkets',
      role: 'shop',
      x: map.tileToWorldCenter(19, 15).x,
      y: map.tileToWorldCenter(19, 15).y,
      dialogue: [
        'Well met, traveler! Looking for sturdy supplies before you plunge into the dark depths?',
        'I carry the finest elixirs, enchanted rings, and forged armor gold can buy. I also buy unwanted spoils from your delves!',
      ],
      color: '#f59e0b',
      facingAngle: -2.0,
    },
    {
      id: 'npc-blacksmith',
      name: 'Torvald the Smith',
      title: 'Master Blacksmith',
      role: 'blacksmith',
      x: map.tileToWorldCenter(23, 19).x,
      y: map.tileToWorldCenter(23, 19).y,
      dialogue: [
        'Hmph! That blade of yours could use some serious attention if you plan on striking down the Dungeon Lords.',
        'Hand over your weapons and armor with a bit of coin, and I will reforge them to strike harder and withstand greater impacts.',
      ],
      color: '#f97316',
      facingAngle: 2.8,
    },
    {
      id: 'npc-guide',
      name: 'Vance the Gatekeeper',
      title: 'Dungeon Sentinel',
      role: 'guide',
      x: map.tileToWorldCenter(16, 4).x,
      y: map.tileToWorldCenter(16, 4).y,
      dialogue: [
        'Halt, {PLAYERNAME}. Beyond this ancient archway lies the 10 Floors of Ruin.',
        'The portal responds only to your will. Once you conquer a floor and slay its guardians, the path forward permanently opens.',
        'Beware of Floor 3, Floor 6, and the dreaded Floor 10—monstrous boss entities await within!',
      ],
      color: '#c084fc',
      facingAngle: 1.57,
    },
  ];

  return {
    map,
    playerSpawn,
    fountainPos,
    dungeonPortalPos,
    npcs,
  };
}
