import { TileType, TileMap, WorldCoord } from './world';
import { NPCEntity, DungeonProp } from './types';

export interface GeneratedTown {
  map: TileMap;
  playerSpawn: WorldCoord;
  fountainPos: WorldCoord;
  dungeonPortalPos: WorldCoord;
  npcs: NPCEntity[];
  props: DungeonProp[];
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

  // Central Fountain: decorative healing water at town center (16, 16)
  map.set(16, 16, TileType.Water);
  const fountainPos = map.tileToWorldCenter(16, 16);

  // Player spawns right beside the central town fountain
  const playerSpawn = map.tileToWorldCenter(16, 18);

  // Dungeon Gate Portal at North (x=16, y=2)
  map.set(16, 2, TileType.Exit);
  const dungeonPortalPos = map.tileToWorldCenter(16, 2);

  // Trees and vegetation clusters along perimeter and plazas
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

  // Handcrafted Town Environmental Props (lantern braziers, statues, banners, crates, barrels)
  const props: DungeonProp[] = [];
  let propId = 1;
  const addTownProp = (
    tx: number,
    ty: number,
    kind: DungeonProp['kind'],
    opts?: { lightColor?: string; lightRadius?: number; offsetX?: number; offsetY?: number }
  ) => {
    const wc = map.tileToWorldCenter(tx, ty);
    props.push({
      id: `town-prop-${propId++}`,
      kind,
      x: wc.x + (opts?.offsetX ?? 0),
      y: wc.y + (opts?.offsetY ?? 0),
      solid: false,
      radius: 14,
      variant: (tx + ty) % 4,
      lightColor: opts?.lightColor,
      lightRadius: opts?.lightRadius,
    });
  };

  // Fountain Plaza Corner Braziers
  addTownProp(13, 13, 'brazier', { lightColor: '#fbbf24', lightRadius: 190 });
  addTownProp(19, 13, 'brazier', { lightColor: '#fbbf24', lightRadius: 190 });
  addTownProp(13, 19, 'brazier', { lightColor: '#fbbf24', lightRadius: 190 });
  addTownProp(19, 19, 'brazier', { lightColor: '#fbbf24', lightRadius: 190 });

  // Dungeon Entrance Gateway Statues & Braziers
  addTownProp(14, 2, 'statue');
  addTownProp(18, 2, 'statue');
  addTownProp(15, 3, 'brazier', { lightColor: '#c084fc', lightRadius: 180 });
  addTownProp(17, 3, 'brazier', { lightColor: '#c084fc', lightRadius: 180 });

  // Building Facade Props (Vault crates, Blacksmith barrels/brazier, Healer crystal, Elder banners)
  addTownProp(7, 10, 'banner', { offsetY: -12 });
  addTownProp(9, 10, 'banner', { offsetY: -12 });
  addTownProp(22, 10, 'crystal', { lightColor: '#38bdf8', lightRadius: 160 });
  addTownProp(24, 10, 'crystal', { lightColor: '#38bdf8', lightRadius: 160 });
  addTownProp(7, 20, 'crate');
  addTownProp(9, 20, 'barrel');
  addTownProp(22, 20, 'brazier', { lightColor: '#f97316', lightRadius: 180 });
  addTownProp(24, 20, 'barrel');
  addTownProp(20, 14, 'crate');
  addTownProp(20, 16, 'barrel');

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
        'Welcome to Town-1, {PLAYERNAME}. You stand in our last sunlit sanctuary beside the northern rift.',
        'Beyond the northern gateway lies a treacherous dungeon of 10 progressive floors teeming with monsters, traps, and ancient bosses.',
        'Each floor is guarded by a deadly Overseer, culminating on Floor 10 where Ignis Rex, Supreme Lord of the Cataclysm, rules the abyss.',
        'Speak with Sister Althea to restore your Health and Mana, visit Brom to store valuable items in the persistent vault, and trade with Garrick or Torvald.',
        'Steel your resolve, brave {CLASS} {PLAYERNAME}. Clear all 10 floors and bring peace to our realm!',
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
        'Blessings upon you, {PLAYERNAME}. The dark miasma of the dungeon takes a heavy toll on even the strongest {CLASS}.',
        'Step forward and let the sacred sanctuary waters mend your wounds and replenish your arcane spirit.',
        'Whenever you return to Town-1, come to me or stand near the central fountain to restore your Health and Mana.',
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
        'Hail, {PLAYERNAME}! Carrying too much gear into the deep floors is a quick way to run out of pack space.',
        'Store your spare weapons, rare armor, and potions in my Town Vault. Everything stored here is saved persistently across all your sessions!',
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
        'Well met, {PLAYERNAME}! Looking for sturdy supplies before you plunge into the 10 Floors of Ruin?',
        'I stock health elixirs, mana flasks, weapons, and armor for every {CLASS}. I also pay fair gold for unwanted dungeon loot!',
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
        'Hail, {PLAYERNAME}! That gear of yours will need tempering if you plan on surviving the deeper dungeon bosses.',
        'Bring me your equipped weapons and armor along with dungeon gold, and I will reforge them to higher tiers on my anvil!',
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
        'Stand ready, {CLASS} {PLAYERNAME}. Beyond this ancient archway lies the 10-Floor Dungeon of Ruin.',
        'You must conquer each floor in order—from Floor 1 down to Floor 10. Slaying a floor boss permanently unlocks the next depth.',
        'Beware of Mortis the Undying on Floor 3, Malakor the Void Weaver on Floor 6, and Ignis Rex on Floor 10!',
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
    props,
  };
}

