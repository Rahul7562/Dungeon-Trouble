import { TileType, TileMap, WorldCoord, TileCoord } from './world';
import {
  NPCEntity,
  DungeonProp,
  DungeonPropKind,
  TownBuilding,
  DaylightState,
  TimeOfDayPhase,
} from './types';

export interface BuildingWallMeta {
  buildingId: string;
  isFrontWall: boolean;
  isWindow: boolean;
}

export const TOWN_TILE_FLAG_TREE = 1;
export const TOWN_TILE_FLAG_ROAD = 2;
export const TOWN_TILE_FLAG_INTERIOR_OAK = 4;
export const TOWN_TILE_FLAG_INTERIOR_STONE = 8;
export const TOWN_TILE_FLAG_INTERIOR_CARPET = 16;
export const TOWN_TILE_FLAG_PERIMETER_WALL = 32;
export const TOWN_TILE_FLAG_FRONT_WALL = 64;
export const TOWN_TILE_FLAG_WINDOW = 128;

export interface TaggedDungeonProp {
  prop: DungeonProp;
  buildingIdx: number; // -1 if outdoor, >= 0 if inside a building (cullable when roof is opaque)
}

export interface TownSpatialChunk {
  props: TaggedDungeonProp[];
  rugs: TaggedDungeonProp[];
  perimeterWalls: number[]; // packed (ty << 16) | tx
  buildingIndices: number[];
}

export interface TownSpatialIndex {
  chunkTiles: number; // 8 tiles per chunk (512x512 world units)
  cols: number;
  rows: number;
  chunks: TownSpatialChunk[];
}

export interface GeneratedTown {
  map: TileMap;
  playerSpawn: WorldCoord;
  fountainPos: WorldCoord;
  dungeonPortalPos: WorldCoord;
  npcs: NPCEntity[];
  props: DungeonProp[];
  buildings: TownBuilding[];
  roadTiles: Set<string>;
  interiorTiles: Map<string, 'oak_planks' | 'stone_flag' | 'royal_carpet'>;
  treeTiles: TileCoord[];
  treeSet: Set<string>;
  buildingWallMap: Map<string, BuildingWallMeta>;
  tileFlags: Uint8Array;
  wallBuildingIdx: Int16Array;
  spatialIndex: TownSpatialIndex;
}

export function isTileInBuilding(tx: number, ty: number, b: TownBuilding): boolean {
  const inMain = tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h;
  if (inMain) return true;
  if (b.wing) {
    return (
      tx >= b.wing.x &&
      tx < b.wing.x + b.wing.w &&
      ty >= b.wing.y &&
      ty < b.wing.y + b.wing.h
    );
  }
  return false;
}

export function isPlayerInsideBuilding(
  worldX: number,
  worldY: number,
  map: TileMap,
  b: TownBuilding
): boolean {
  const pt = map.worldToTile(worldX, worldY);
  if (isTileInBuilding(pt.x, pt.y, b)) {
    return true;
  }
  // Also trigger roof fade as player steps onto the threshold/doorway tile
  for (const d of b.doors) {
    if (Math.abs(pt.x - d.x) <= 1 && Math.abs(pt.y - d.y) <= 1) {
      return true;
    }
  }
  return false;
}

export function computeDaylightState(rawTimeHours: number): DaylightState {
  const timeHours = ((rawTimeHours % 24) + 24) % 24;
  const totalMinutes = Math.floor(timeHours * 60);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const formattedTime = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

  let phase: TimeOfDayPhase = 'Morning';
  if (timeHours >= 5.0 && timeHours < 7.5) {
    phase = 'Dawn';
  } else if (timeHours >= 7.5 && timeHours < 12.0) {
    phase = 'Morning';
  } else if (timeHours >= 12.0 && timeHours < 16.5) {
    phase = 'Afternoon';
  } else if (timeHours >= 16.5 && timeHours < 19.25) {
    phase = 'Evening';
  } else if (timeHours >= 19.25 && timeHours < 21.0) {
    phase = 'Dusk';
  } else {
    phase = 'Night';
  }

  // Continuous 24-hour keyframe table for smooth cosine interpolation (zero sudden jumps, no harsh red wash)
  interface DaylightKeyframe {
    hour: number;
    darkness: number;
    shadowRgb: [number, number, number];
    tintRgb: [number, number, number];
    tintAlpha: number;
  }

  const keyframes: DaylightKeyframe[] = [
    { hour: 0.0, darkness: 0.56, shadowRgb: [7, 13, 28], tintRgb: [56, 189, 248], tintAlpha: 0.035 },
    { hour: 4.5, darkness: 0.54, shadowRgb: [8, 15, 32], tintRgb: [96, 165, 250], tintAlpha: 0.035 },
    { hour: 6.25, darkness: 0.24, shadowRgb: [14, 24, 42], tintRgb: [251, 191, 36], tintAlpha: 0.045 },
    { hour: 8.0, darkness: 0.02, shadowRgb: [16, 28, 44], tintRgb: [254, 240, 138], tintAlpha: 0.015 },
    { hour: 12.5, darkness: 0.0, shadowRgb: [16, 28, 44], tintRgb: [255, 255, 255], tintAlpha: 0.0 },
    { hour: 16.0, darkness: 0.02, shadowRgb: [16, 28, 44], tintRgb: [253, 224, 71], tintAlpha: 0.015 },
    { hour: 18.0, darkness: 0.20, shadowRgb: [14, 23, 42], tintRgb: [251, 191, 36], tintAlpha: 0.045 },
    { hour: 19.75, darkness: 0.42, shadowRgb: [10, 18, 36], tintRgb: [96, 165, 250], tintAlpha: 0.04 },
    { hour: 21.25, darkness: 0.56, shadowRgb: [7, 13, 28], tintRgb: [56, 189, 248], tintAlpha: 0.035 },
    { hour: 24.0, darkness: 0.56, shadowRgb: [7, 13, 28], tintRgb: [56, 189, 248], tintAlpha: 0.035 },
  ];

  let k0 = keyframes[0];
  let k1 = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (timeHours >= keyframes[i].hour && timeHours <= keyframes[i + 1].hour) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, k1.hour - k0.hour);
  const linearT = Math.max(0, Math.min(1, (timeHours - k0.hour) / span));
  // Smooth cosine easing so transitions between phases are completely seamless
  const s = 0.5 - 0.5 * Math.cos(linearT * Math.PI);

  const ambientDarkness = k0.darkness + (k1.darkness - k0.darkness) * s;
  const shadowTintRgb: [number, number, number] = [
    Math.round(k0.shadowRgb[0] + (k1.shadowRgb[0] - k0.shadowRgb[0]) * s),
    Math.round(k0.shadowRgb[1] + (k1.shadowRgb[1] - k0.shadowRgb[1]) * s),
    Math.round(k0.shadowRgb[2] + (k1.shadowRgb[2] - k0.shadowRgb[2]) * s),
  ];
  const tintR = Math.round(k0.tintRgb[0] + (k1.tintRgb[0] - k0.tintRgb[0]) * s);
  const tintG = Math.round(k0.tintRgb[1] + (k1.tintRgb[1] - k0.tintRgb[1]) * s);
  const tintB = Math.round(k0.tintRgb[2] + (k1.tintRgb[2] - k0.tintRgb[2]) * s);
  const skyTintIntensity = k0.tintAlpha + (k1.tintAlpha - k0.tintAlpha) * s;
  const skyTintColor = `rgba(${tintR}, ${tintG}, ${tintB}, ${skyTintIntensity.toFixed(3)})`;

  // Smooth lantern fade-in during Evening (16:45 -> 18:45) and fade-out at Dawn (05:15 -> 07:00)
  let lanternIntensity = 0;
  if (timeHours >= 18.75 || timeHours < 5.25) {
    lanternIntensity = 1.0;
  } else if (timeHours >= 16.75 && timeHours < 18.75) {
    const lt = (timeHours - 16.75) / 2.0;
    lanternIntensity = 0.5 - 0.5 * Math.cos(lt * Math.PI);
  } else if (timeHours >= 5.25 && timeHours < 7.0) {
    const lt = (timeHours - 5.25) / 1.75;
    lanternIntensity = 1.0 - (0.5 - 0.5 * Math.cos(lt * Math.PI));
  }

  // Sun angle across the sky arc
  const dayRad = ((timeHours - 6.0) / 24.0) * Math.PI * 2;
  const sunAngleX = Math.cos(dayRad);
  const sunAngleY = Math.sin(dayRad);
  const shadowLength =
    phase === 'Morning' || phase === 'Afternoon' ? 1.0 : phase === 'Evening' || phase === 'Dawn' ? 1.35 : 0.9;
  const isNightLightsOn = lanternIntensity > 0.08;

  return {
    timeHours,
    formattedTime,
    phase,
    ambientDarkness,
    skyTintColor,
    skyTintIntensity,
    sunAngleX,
    sunAngleY,
    shadowLength,
    isNightLightsOn,
    lanternIntensity,
    shadowTintRgb,
    dayProgress: timeHours / 24.0,
  };
}

/**
 * Generates an expansive 96x96 sprawling medieval valley for Town-1 (Oakridge Valley):
 * - Houses are spread 28 to 38+ tiles (55+ to 75+ meters) apart across distinct scenic districts
 * - Meandering Silverbrook River, Emerald Mirror Lake, and Whispering Abbey Pond
 * - Winding cobblestone & country roads, 4 wide stone bridges, 25+ benches, street lanterns, wells, and forest groves
 * - Enterable half-timbered houses with furnished interiors and dynamic roof cutaways
 * - 12 wandering NPCs and villagers with daily routines and night lanterns
 */
export function generateTownLevel(): GeneratedTown {
  const width = 96;
  const height = 96;
  const map = new TileMap(width, height, 64);

  const roadTiles = new Set<string>();
  const interiorTiles = new Map<string, 'oak_planks' | 'stone_flag' | 'royal_carpet'>();
  const treeTiles: TileCoord[] = [];
  const treeKeySet = new Set<string>();
  const props: DungeonProp[] = [];
  let propCounter = 1;

  const addProp = (
    kind: DungeonPropKind,
    tx: number,
    ty: number,
    offsetX = 0,
    offsetY = 0,
    variant = 0
  ) => {
    const pos = map.tileToWorldCenter(tx, ty);
    const isLight =
      kind === 'street_lantern' ||
      kind === 'fireplace' ||
      kind === 'brazier' ||
      kind === 'crystal' ||
      kind === 'alchemy_table';
    const lightColor =
      kind === 'crystal'
        ? '#38bdf8'
        : kind === 'alchemy_table'
        ? '#34d399'
        : isLight
        ? '#fb923c'
        : undefined;
    const lightRadius =
      kind === 'street_lantern'
        ? 175
        : kind === 'fireplace'
        ? 165
        : kind === 'brazier'
        ? 150
        : isLight
        ? 125
        : undefined;

    props.push({
      id: `town-prop-${propCounter++}`,
      kind,
      x: pos.x + offsetX,
      y: pos.y + offsetY,
      solid: kind !== 'rug',
      radius: kind === 'rug' ? 0 : 14,
      variant,
      lightColor,
      lightRadius,
    });
  };

  const markRoadBrush = (cx: number, cy: number, radius = 1) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = Math.round(cx + dx);
        const ty = Math.round(cy + dy);
        if (tx > 1 && tx < width - 2 && ty > 1 && ty < height - 2) {
          map.set(tx, ty, TileType.Floor);
          roadTiles.add(`${tx},${ty}`);
        }
      }
    }
  };

  const carveRoadPath = (x0: number, y0: number, x1: number, y1: number, brushRadius = 1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      // Add gentle organic curve to long country roads
      const wobble = Math.sin(t * Math.PI) * 1.2;
      const perpX = -(y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
      const perpY = (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
      const rx = x0 + (x1 - x0) * t + perpX * wobble;
      const ry = y0 + (y1 - y0) * t + perpY * wobble;
      markRoadBrush(rx, ry, brushRadius);
    }
  };

  // 1. Fill base map with walkable meadow Floor and natural forested border
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        map.set(x, y, TileType.Wall);
        treeTiles.push({ x, y });
        treeKeySet.add(`${x},${y}`);
      } else {
        map.set(x, y, TileType.Floor);
      }
    }
  }

  // Organic uneven treeline along the outer valley boundary (depth 1..3)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const distEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (distEdge === 1 && (x * 13 + y * 29) % 3 !== 0) {
        map.set(x, y, TileType.Wall);
        treeTiles.push({ x, y });
        treeKeySet.add(`${x},${y}`);
      } else if (distEdge === 2 && (x * 19 + y * 37) % 5 === 0) {
        map.set(x, y, TileType.Wall);
        treeTiles.push({ x, y });
        treeKeySet.add(`${x},${y}`);
      }
    }
  }

  // 2. Carve Water Features:
  // 2A. The Silverbrook River meandering from Northwest (3, 28) across the valley to East-Southeast (92, 62)
  for (let x = 3; x <= 92; x++) {
    const t = (x - 3) / 89;
    const riverCenterY = Math.round(
      28 + t * 32 + Math.sin(x * 0.095) * 4.5 + Math.cos(x * 0.05) * 2.5
    );
    const riverHalfWidth = x > 54 && x < 72 ? 2 : 1;
    for (let wy = riverCenterY - riverHalfWidth; wy <= riverCenterY + riverHalfWidth + 1; wy++) {
      if (wy > 3 && wy < height - 4) {
        map.set(x, wy, TileType.Water);
      }
    }
  }

  // 2B. Emerald Mirror Lake in the South-Southeast valley (center around 62, 64)
  for (let y = 56; y <= 71; y++) {
    for (let x = 54; x <= 71; x++) {
      const dx = (x - 62.5) / 8.0;
      const dy = (y - 63.5) / 7.0;
      const wobble = Math.sin(x * 0.6 + y * 0.4) * 0.14;
      if (dx * dx + dy * dy + wobble <= 0.96) {
        map.set(x, y, TileType.Water);
      }
    }
  }

  // 2C. Whispering Abbey Pond in the Northeast glade (center around 65, 23)
  for (let y = 19; y <= 27; y++) {
    for (let x = 60; x <= 70; x++) {
      const dx = (x - 65) / 5.0;
      const dy = (y - 23) / 4.0;
      if (dx * dx + dy * dy <= 0.92) {
        map.set(x, y, TileType.Water);
      }
    }
  }

  // 2D. Western Millpond in the West-Southwest meadow (center around 28, 58)
  for (let y = 54; y <= 62; y++) {
    for (let x = 23; x <= 33; x++) {
      const dx = (x - 28) / 4.8;
      const dy = (y - 58) / 3.8;
      if (dx * dx + dy * dy <= 0.9) {
        map.set(x, y, TileType.Water);
      }
    }
  }

  // 3. Carve Central Sanctuary Fountain Plaza at (48, 46) & Winding Country Road Network
  for (let y = 41; y <= 51; y++) {
    for (let x = 43; x <= 53; x++) {
      if (Math.hypot(x - 48, y - 46) <= 5.6) {
        map.set(x, y, TileType.Floor);
        roadTiles.add(`${x},${y}`);
      }
    }
  }

  // Winding country roads connecting the Central Plaza (48, 46) to all 8 widely separated buildings
  // and crossing the Silverbrook River via 4 stone-and-timber bridges!
  // North Highroad (crosses river at Bridge 2 around x=48, y=39) -> Elder Thorne's Manor (47, 17)
  carveRoadPath(48, 46, 48, 17, 1);
  // Northwest Tavern Trail (crosses river at Bridge 1 around x=20, y=31) -> Griffin Tavern (18, 21)
  carveRoadPath(48, 46, 29, 39, 1);
  carveRoadPath(29, 39, 18, 21, 1);
  // Scenic Northern Ridge Road linking Griffin Tavern (18, 21) -> Elder Manor (48, 18) -> Abbey (78, 19)
  carveRoadPath(18, 21, 48, 18, 1);
  carveRoadPath(48, 18, 78, 19, 1);
  // Northeast Abbey Trail -> Abbey of the Dawn (78, 19)
  carveRoadPath(48, 34, 78, 19, 1);
  // West Smithy Road -> Torvald's Ironworks (15, 51)
  carveRoadPath(48, 46, 15, 51, 1);
  // East Market Road (crosses river at Bridge 3 around x=66, y=47) -> Garrick's Emporium (80, 49)
  carveRoadPath(48, 46, 80, 49, 1);
  // Southwest Keep Road -> Ironclad Royal Vault (19, 81)
  carveRoadPath(15, 51, 19, 81, 1);
  carveRoadPath(48, 46, 36, 65, 1);
  carveRoadPath(36, 65, 19, 81, 1);
  // South Lakeside Road -> Riverside Weaver's Cottage (49, 82)
  carveRoadPath(48, 46, 49, 82, 1);
  // Southeast Orchard Road (crosses east of Mirror Lake at Bridge 4 around x=77, y=58) -> Miller's Homestead (79, 80)
  carveRoadPath(80, 49, 79, 80, 1);
  carveRoadPath(49, 82, 79, 80, 1);
  // Path to the Ancient Abyssal Portal Sanctuary at (33, 25)
  carveRoadPath(29, 34, 33, 25, 1);

  // 4. Define 8 Widely Separated Enterable Medieval Buildings (28 to 38 tiles / 55m-75m apart!)
  // Every building has its own open meadow surroundings, custom interior floor, doors, windows, and roof cutaway.
  const buildings: TownBuilding[] = [
    {
      id: 'griffin_tavern',
      name: 'The Prancing Griffin Inn',
      subtitle: 'Hearth, Ale & Travelers Hall',
      roofStyle: 'weathered_stone_inn',
      x: 12,
      y: 11,
      w: 11,
      h: 9,
      wing: { x: 22, y: 13, w: 5, h: 6 },
      doors: [
        { x: 17, y: 19 },
        { x: 18, y: 19 },
        { x: 24, y: 18 },
      ],
      windows: [
        { x: 14, y: 19 },
        { x: 20, y: 19 },
        { x: 12, y: 15 },
        { x: 26, y: 15 },
      ],
      chimneyTile: { x: 14, y: 12 },
      hasTimberGallery: true,
      floorStyle: 'oak_planks',
    },
    {
      id: 'elder_manor',
      name: "Elder Thorne's High Manor",
      subtitle: 'Council Hall & Royal Library',
      roofStyle: 'teal_slate_manor',
      x: 43,
      y: 8,
      w: 11,
      h: 9,
      wing: { x: 53, y: 10, w: 5, h: 6 },
      doors: [
        { x: 48, y: 16 },
        { x: 49, y: 16 },
      ],
      windows: [
        { x: 45, y: 16 },
        { x: 51, y: 16 },
        { x: 55, y: 15 },
        { x: 43, y: 12 },
      ],
      hasTurret: true,
      turretTile: { x: 56, y: 10 },
      chimneyTile: { x: 45, y: 9 },
      hasTimberGallery: true,
      floorStyle: 'royal_carpet',
    },
    {
      id: 'healer_chapel',
      name: 'Abbey of the Dawn',
      subtitle: "Sister Althea's Healing Sanctuary",
      roofStyle: 'teal_slate_manor',
      x: 74,
      y: 10,
      w: 10,
      h: 8,
      doors: [
        { x: 78, y: 17 },
        { x: 79, y: 17 },
      ],
      windows: [
        { x: 76, y: 17 },
        { x: 81, y: 17 },
        { x: 74, y: 14 },
        { x: 83, y: 14 },
      ],
      hasTurret: true,
      turretTile: { x: 82, y: 11 },
      floorStyle: 'stone_flag',
    },
    {
      id: 'blacksmith_forge',
      name: "Torvald's Ironworks & Smithy",
      subtitle: 'Master Weaponsmith & Armory',
      roofStyle: 'terracotta_tudor',
      x: 10,
      y: 42,
      w: 10,
      h: 8,
      doors: [
        { x: 14, y: 49 },
        { x: 15, y: 49 },
        { x: 19, y: 46 },
      ],
      windows: [
        { x: 12, y: 49 },
        { x: 17, y: 49 },
        { x: 10, y: 45 },
      ],
      chimneyTile: { x: 12, y: 43 },
      hasTimberGallery: true,
      floorStyle: 'stone_flag',
    },
    {
      id: 'merchant_emporium',
      name: "Garrick's Curios & Alchemy",
      subtitle: 'Potions, Relics & Rare Goods',
      roofStyle: 'terracotta_tudor',
      x: 75,
      y: 40,
      w: 10,
      h: 8,
      wing: { x: 84, y: 42, w: 4, h: 5 },
      doors: [
        { x: 79, y: 47 },
        { x: 80, y: 47 },
      ],
      windows: [
        { x: 77, y: 47 },
        { x: 82, y: 47 },
        { x: 86, y: 46 },
      ],
      chimneyTile: { x: 77, y: 41 },
      hasTimberGallery: true,
      floorStyle: 'oak_planks',
    },
    {
      id: 'vault_stronghold',
      name: 'Ironclad Royal Vault',
      subtitle: "Brom's Treasury & Relic Depository",
      roofStyle: 'stone_keep',
      x: 14,
      y: 72,
      w: 10,
      h: 8,
      doors: [
        { x: 18, y: 79 },
        { x: 19, y: 79 },
      ],
      windows: [
        { x: 16, y: 79 },
        { x: 21, y: 79 },
      ],
      hasTurret: true,
      turretTile: { x: 15, y: 73 },
      floorStyle: 'stone_flag',
    },
    {
      id: 'weaver_cottage',
      name: "Lakeside Weaver's Lodge",
      subtitle: 'Tapestries, Looms & Hearth',
      roofStyle: 'rustic_cottage',
      x: 45,
      y: 74,
      w: 9,
      h: 7,
      doors: [
        { x: 49, y: 80 },
        { x: 49, y: 74 },
      ],
      windows: [
        { x: 47, y: 80 },
        { x: 51, y: 80 },
      ],
      chimneyTile: { x: 46, y: 75 },
      floorStyle: 'oak_planks',
    },
    {
      id: 'miller_homestead',
      name: "Orchard Miller's Homestead",
      subtitle: 'Granary, Bakery & Farmhouse',
      roofStyle: 'rustic_cottage',
      x: 74,
      y: 72,
      w: 10,
      h: 8,
      doors: [
        { x: 78, y: 79 },
        { x: 79, y: 79 },
      ],
      windows: [
        { x: 76, y: 79 },
        { x: 81, y: 79 },
      ],
      chimneyTile: { x: 82, y: 73 },
      hasTimberGallery: true,
      floorStyle: 'oak_planks',
    },
  ];

  const buildingWallMap = new Map<string, BuildingWallMeta>();

  // Stamp all 8 buildings onto the TileMap: outer perimeter = Wall (except doors), interior = Floor
  for (const b of buildings) {
    const doorSet = new Set(b.doors.map((d) => `${d.x},${d.y}`));
    const windowSet = new Set(b.windows.map((w) => `${w.x},${w.y}`));
    const minX = b.x;
    const maxX = b.wing ? Math.max(b.x + b.w, b.wing.x + b.wing.w) : b.x + b.w;
    const minY = b.y;
    const maxY = b.wing ? Math.max(b.y + b.h, b.wing.y + b.wing.h) : b.y + b.h;

    // Clear a generous 3-tile walkable courtyard around each building so trees/water never block doors
    for (let cy = minY - 3; cy <= maxY + 3; cy++) {
      for (let cx = minX - 3; cx <= maxX + 3; cx++) {
        if (cx > 1 && cx < width - 2 && cy > 1 && cy < height - 2) {
          if (map.get(cx, cy) === TileType.Water) {
            map.set(cx, cy, TileType.Floor);
          }
        }
      }
    }

    for (let ty = minY; ty < maxY; ty++) {
      for (let tx = minX; tx < maxX; tx++) {
        if (!isTileInBuilding(tx, ty, b)) continue;

        const nIn = isTileInBuilding(tx, ty - 1, b);
        const sIn = isTileInBuilding(tx, ty + 1, b);
        const wIn = isTileInBuilding(tx - 1, ty, b);
        const eIn = isTileInBuilding(tx + 1, ty, b);
        const isBoundary = !nIn || !sIn || !wIn || !eIn;

        const key = `${tx},${ty}`;
        roadTiles.delete(key);

        if (isBoundary && !doorSet.has(key)) {
          map.set(tx, ty, TileType.Wall);
          buildingWallMap.set(key, {
            buildingId: b.id,
            isFrontWall: !sIn || !eIn,
            isWindow: windowSet.has(key),
          });
        } else {
          map.set(tx, ty, TileType.Floor);
          interiorTiles.set(key, b.floorStyle || 'oak_planks');
        }
      }
    }

    // Pave stone threshold outside each building door
    for (const d of b.doors) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const rx = d.x + dx;
          const ry = d.y + dy;
          if (!isTileInBuilding(rx, ry, b)) {
            map.set(rx, ry, TileType.Floor);
            roadTiles.add(`${rx},${ry}`);
          }
        }
      }
    }
  }

  // 5. Place Interior Furnishings Inside Every Building (Visible when player walks inside & roof fades!)
  // 5.1 The Prancing Griffin Inn (12..26, 11..19)
  addProp('fireplace', 14, 12, 0, 8, 0);
  addProp('rug', 17, 15, 0, 0, 0);
  addProp('table', 15, 15, 0, 0, 0);
  addProp('chair', 14, 15, 10, 0, 0);
  addProp('chair', 16, 15, -10, 0, 1);
  addProp('table', 19, 15, 0, 0, 1);
  addProp('chair', 18, 15, 10, 0, 0);
  addProp('chair', 20, 15, -10, 0, 1);
  addProp('barrel', 21, 12, 0, 0, 0);
  addProp('barrel', 21, 13, 8, 4, 1);
  addProp('bed', 24, 14, 0, 0, 0);
  addProp('bed', 25, 14, 12, 0, 1);
  // Outdoor tavern beer-garden tables & benches overlooking the river
  addProp('table', 15, 22, 0, 0, 0);
  addProp('bench', 15, 23, 0, -6, 0);
  addProp('street_lantern', 19, 21, 0, 0, 0);

  // 5.2 Elder Thorne's High Manor (43..57, 8..16)
  addProp('fireplace', 46, 9, 0, 8, 0);
  addProp('rug', 48, 12, 0, 0, 1);
  addProp('bookshelf', 44, 9, 0, 6, 0);
  addProp('bookshelf', 50, 9, 0, 6, 1);
  addProp('table', 48, 12, 0, 0, 0);
  addProp('chair', 47, 12, 8, 0, 0);
  addProp('chair', 49, 12, -8, 0, 1);
  addProp('bed', 55, 11, 0, 4, 0);
  addProp('bookshelf', 56, 11, 0, 6, 0);
  addProp('street_lantern', 47, 18, 0, 0, 0);
  addProp('street_lantern', 50, 18, 0, 0, 0);

  // 5.3 Abbey of the Dawn (74..83, 10..17)
  addProp('altar', 78, 12, 0, 0, 0);
  addProp('rug', 78, 14, 0, 0, 2);
  addProp('crystal', 75, 12, 0, 0, 0);
  addProp('crystal', 81, 12, 0, 0, 1);
  addProp('bench', 76, 14, 0, 0, 0);
  addProp('bench', 80, 14, 0, 0, 0);
  addProp('bookshelf', 75, 11, 0, 6, 0);
  addProp('bed', 81, 15, 0, 0, 1);
  addProp('well', 72, 20, 0, 0, 0);

  // 5.4 Torvald's Ironworks & Smithy (10..19, 42..49)
  addProp('fireplace', 12, 43, 0, 8, 1);
  addProp('anvil', 14, 45, 0, 0, 0);
  addProp('weapon_rack', 11, 43, 0, 6, 0);
  addProp('weapon_rack', 17, 43, 0, 6, 1);
  addProp('barrel', 18, 44, 0, 0, 0);
  addProp('crate', 18, 47, 0, 0, 1);
  addProp('table', 16, 46, 0, 0, 0);
  // Outdoor forging yard
  addProp('anvil', 16, 51, 0, 0, 0);
  addProp('brazier', 13, 51, 0, 0, 0);
  addProp('weapon_rack', 18, 50, 0, 0, 0);

  // 5.5 Garrick's Curios & Alchemy Emporium (75..87, 40..47)
  addProp('alchemy_table', 78, 42, 0, 0, 0);
  addProp('bookshelf', 76, 41, 0, 6, 0);
  addProp('bookshelf', 81, 41, 0, 6, 1);
  addProp('rug', 79, 44, 0, 0, 0);
  addProp('table', 80, 44, 0, 0, 1);
  addProp('bed', 85, 43, 0, 0, 0);
  addProp('crate', 83, 45, 0, 0, 0);
  // Outdoor market stalls & benches in East Market Meadow
  addProp('market_stall', 73, 49, 0, 0, 0);
  addProp('market_stall', 83, 49, 0, 0, 1);
  addProp('street_lantern', 78, 49, 0, 0, 0);

  // 5.6 Ironclad Royal Vault (14..23, 72..79)
  addProp('rug', 18, 75, 0, 0, 1);
  addProp('weapon_rack', 15, 73, 0, 6, 0);
  addProp('weapon_rack', 21, 73, 0, 6, 1);
  addProp('crate', 16, 76, 0, 0, 0);
  addProp('crate', 21, 76, 0, 0, 1);
  addProp('barrel', 22, 74, 0, 0, 0);
  addProp('table', 18, 75, 0, 0, 0);
  addProp('brazier', 17, 81, 0, 0, 0);
  addProp('brazier', 20, 81, 0, 0, 0);

  // 5.7 Lakeside Weaver's Lodge (45..53, 74..80)
  addProp('fireplace', 47, 75, 0, 8, 0);
  addProp('rug', 49, 77, 0, 0, 2);
  addProp('bed', 51, 75, 0, 4, 1);
  addProp('table', 48, 77, 0, 0, 0);
  addProp('chair', 47, 77, 8, 0, 0);
  addProp('bookshelf', 50, 75, 0, 6, 0);

  // 5.8 Orchard Miller's Homestead (74..83, 72..79)
  addProp('fireplace', 81, 73, 0, 8, 0);
  addProp('rug', 78, 76, 0, 0, 0);
  addProp('bed', 75, 74, 0, 4, 0);
  addProp('table', 78, 76, 0, 0, 1);
  addProp('chair', 77, 76, 8, 0, 0);
  addProp('chair', 79, 76, -8, 0, 1);
  addProp('barrel', 82, 76, 0, 0, 0);
  addProp('well', 72, 80, 0, 0, 0);

  // 6. Central Sanctuary Fountain Courtyard (48, 46) & Abyssal Portal Shrine (33, 24)
  const fountainPos = map.tileToWorldCenter(48, 46);
  addProp('street_lantern', 44, 44, 0, 0, 0);
  addProp('street_lantern', 52, 44, 0, 0, 0);
  addProp('street_lantern', 44, 48, 0, 0, 0);
  addProp('street_lantern', 52, 48, 0, 0, 0);
  addProp('bench', 46, 43, 0, 0, 0);
  addProp('bench', 50, 43, 0, 0, 0);
  addProp('bench', 46, 49, 0, 0, 0);
  addProp('bench', 50, 49, 0, 0, 0);
  addProp('well', 41, 46, 0, 0, 0);

  // Abyssal Dungeon Portal Shrine at (33, 24) in a mystic stone circle
  const portalTileX = 33;
  const portalTileY = 24;
  for (let py = portalTileY - 2; py <= portalTileY + 2; py++) {
    for (let px = portalTileX - 2; px <= portalTileX + 2; px++) {
      map.set(px, py, TileType.Floor);
      roadTiles.add(`${px},${py}`);
    }
  }
  map.set(portalTileX, portalTileY, TileType.Exit);
  const dungeonPortalPos = map.tileToWorldCenter(portalTileX, portalTileY);
  addProp('arch', portalTileX, portalTileY - 1, 0, 0, 0);
  addProp('brazier', portalTileX - 2, portalTileY + 1, 0, 0, 0);
  addProp('brazier', portalTileX + 2, portalTileY + 1, 0, 0, 0);
  addProp('pillar', portalTileX - 2, portalTileY - 1, 0, 0, 0);
  addProp('pillar', portalTileX + 2, portalTileY - 1, 0, 0, 0);

  // 7. Scenic Benches, Street Lanterns, & Rest Spots Along Rivers, Lakes, & Country Roads
  const scenicBenches: Array<{ x: number; y: number; rot?: number }> = [
    // Overlooking Silverbrook River
    { x: 25, y: 31 },
    { x: 39, y: 36 },
    { x: 55, y: 44 },
    { x: 69, y: 50 },
    // Overlooking Emerald Mirror Lake
    { x: 53, y: 62 },
    { x: 56, y: 55 },
    { x: 63, y: 54 },
    { x: 62, y: 72 },
    { x: 72, y: 64 },
    // Overlooking Whispering Abbey Pond
    { x: 59, y: 23 },
    { x: 65, y: 18 },
    { x: 65, y: 28 },
    // Overlooking Western Millpond
    { x: 22, y: 58 },
    { x: 28, y: 53 },
    { x: 28, y: 63 },
    // Along country trails between distant houses
    { x: 32, y: 19 },
    { x: 63, y: 16 },
    { x: 30, y: 48 },
    { x: 62, y: 46 },
    { x: 33, y: 76 },
    { x: 63, y: 78 },
  ];
  for (const sb of scenicBenches) {
    if (map.get(sb.x, sb.y) === TileType.Floor) {
      addProp('bench', sb.x, sb.y, 0, 0, 0);
    }
  }

  const roadsideLanterns: TileCoord[] = [
    { x: 36, y: 42 },
    { x: 26, y: 36 },
    { x: 48, y: 35 },
    { x: 48, y: 26 },
    { x: 62, y: 28 },
    { x: 62, y: 47 },
    { x: 32, y: 50 },
    { x: 48, y: 58 },
    { x: 49, y: 70 },
    { x: 32, y: 72 },
    { x: 65, y: 75 },
    { x: 78, y: 62 },
  ];
  for (const rl of roadsideLanterns) {
    if (map.get(rl.x, rl.y) === TileType.Floor) {
      addProp('street_lantern', rl.x, rl.y, 0, 0, 0);
    }
  }

  // 8. Scatter Natural Woodland Tree Groves & Meadow Trees Across the 96x96 Valley
  // Never place trees on roads, inside buildings, within 3 tiles of building doors, or in water
  const isNearBuildingOrDoor = (tx: number, ty: number): boolean => {
    for (const b of buildings) {
      const maxX = b.wing ? Math.max(b.x + b.w, b.wing.x + b.wing.w) : b.x + b.w;
      const maxY = b.wing ? Math.max(b.y + b.h, b.wing.y + b.wing.h) : b.y + b.h;
      if (tx >= b.x - 3 && tx <= maxX + 3 && ty >= b.y - 3 && ty <= maxY + 3) {
        return true;
      }
    }
    if (Math.hypot(tx - 48, ty - 46) <= 8) return true;
    if (Math.hypot(tx - portalTileX, ty - portalTileY) <= 5) return true;
    return false;
  };

  // Curated scenic forest groves & orchard clusters between the distant houses
  const groveCenters: Array<{ x: number; y: number; r: number }> = [
    { x: 32, y: 12, r: 5 }, // North-West Pine & Oak Grove
    { x: 64, y: 11, r: 4 }, // North-East Birch & Blossom Grove
    { x: 86, y: 26, r: 5 }, // Eastern Highland Woods
    { x: 10, y: 32, r: 4 }, // Western Riverbank Copse
    { x: 37, y: 55, r: 4 }, // Central-West Meadow Woods
    { x: 26, y: 70, r: 4 }, // Southwest Watch Woods
    { x: 36, y: 84, r: 5 }, // Southern Valley Timberline
    { x: 62, y: 84, r: 5 }, // Southeast Orchard Woods
    { x: 86, y: 62, r: 4 }, // Eastern Orchard Glade
  ];

  for (const grove of groveCenters) {
    for (let gy = grove.y - grove.r; gy <= grove.y + grove.r; gy++) {
      for (let gx = grove.x - grove.r; gx <= grove.x + grove.r; gx++) {
        if (gx <= 2 || gx >= width - 3 || gy <= 2 || gy >= height - 3) continue;
        const d = Math.hypot(gx - grove.x, gy - grove.y);
        // Leave walkable spacing between individual trees so the player can walk through groves!
        if (
          d <= grove.r &&
          (gx % 2 === 0 && gy % 2 === 0) &&
          ((gx * 17 + gy * 31) % 3 !== 0)
        ) {
          const key = `${gx},${gy}`;
          if (
            map.get(gx, gy) === TileType.Floor &&
            !roadTiles.has(key) &&
            !interiorTiles.has(key) &&
            !treeKeySet.has(key) &&
            !isNearBuildingOrDoor(gx, gy)
          ) {
            map.set(gx, gy, TileType.Wall);
            treeTiles.push({ x: gx, y: gy });
            treeKeySet.add(key);
          }
        }
      }
    }
  }

  // Also scatter solitary shade trees near ponds, riverbanks, and meadows
  const solitaryTrees: TileCoord[] = [
    { x: 23, y: 28 },
    { x: 42, y: 34 },
    { x: 54, y: 38 },
    { x: 58, y: 20 },
    { x: 71, y: 24 },
    { x: 52, y: 58 },
    { x: 72, y: 59 },
    { x: 58, y: 73 },
    { x: 22, y: 55 },
    { x: 34, y: 60 },
    { x: 66, y: 42 },
    { x: 26, y: 44 },
  ];
  for (const st of solitaryTrees) {
    const key = `${st.x},${st.y}`;
    if (
      map.get(st.x, st.y) === TileType.Floor &&
      !roadTiles.has(key) &&
      !interiorTiles.has(key) &&
      !treeKeySet.has(key) &&
      !isNearBuildingOrDoor(st.x, st.y)
    ) {
      map.set(st.x, st.y, TileType.Wall);
      treeTiles.push(st);
      treeKeySet.add(key);
    }
  }

  // 9. Populate Key NPCs & Wandering Villagers Across the Sprawling Valley (strictly on dry walkable Floor tiles)
  const wp = (tx: number, ty: number) => {
    const raw = map.tileToWorldCenter(tx, ty);
    return map.findNearestDryWorldPos(raw.x, raw.y, 18);
  };

  const npcs: NPCEntity[] = [
    {
      id: 'npc-elder',
      name: 'Elder Thorne',
      title: 'High Archon of Oakridge',
      role: 'elder',
      ...wp(48, 44),
      homePos: wp(48, 13),
      waypoints: [wp(48, 44), wp(48, 35), wp(48, 19), wp(48, 13), wp(46, 44)],
      currentWaypointIdx: 0,
      moveSpeed: 38,
      waitTimer: 4.0,
      activityText: 'Overseeing the Sanctuary Plaza',
      activities: [
        'Consulting ancient chronicles',
        'Blessing the Sanctuary Fountain',
        'Inspecting the High Manor',
        'Watching the valley horizon',
      ],
      carriesLantern: true,
      color: '#fbbf24',
      facingAngle: Math.PI / 2,
      dialogue: [
        'Welcome to Oakridge Valley, traveler. Our houses stand spread across the green hills and riverbanks.',
        'Step inside any manor, tavern, or cottage—their roofs will part so you may rest by the hearth.',
        'Watch the sun and moon above your minimap; when night falls, our lanterns guide the roads.',
      ],
    },
    {
      id: 'npc-healer',
      name: 'Sister Althea',
      title: 'Cleric of the Dawn',
      role: 'healer',
      ...wp(51, 45),
      homePos: wp(78, 14),
      waypoints: [wp(51, 45), wp(54, 34), wp(64, 33), wp(78, 19), wp(78, 14), wp(50, 46)],
      currentWaypointIdx: 0,
      moveSpeed: 40,
      waitTimer: 3.5,
      activityText: 'Tending the Healing Waters',
      activities: [
        'Chanting a hymn of restoration',
        'Gathering herbs by Whispering Pond',
        'Lighting prayer candles in the Abbey',
        'Blessing weary adventurers',
      ],
      carriesLantern: true,
      color: '#38bdf8',
      facingAngle: Math.PI / 2,
      dialogue: [
        'May the golden light mend your wounds and restore your spirit.',
        'Drink from the central fountain or visit the Abbey of the Dawn in the northeast glade.',
      ],
    },
    {
      id: 'npc-blacksmith',
      name: 'Torvald Ironhand',
      title: 'Master Weaponsmith',
      role: 'blacksmith',
      ...wp(45, 46),
      homePos: wp(15, 46),
      waypoints: [wp(45, 46), wp(28, 49), wp(16, 51), wp(15, 46), wp(44, 47)],
      currentWaypointIdx: 0,
      moveSpeed: 42,
      waitTimer: 3.0,
      activityText: 'Inspecting tempered steel',
      activities: [
        'Hammering mythic alloy at the anvil',
        'Stoking the forge bellows',
        'Delivering blades to the plaza',
        'Quenching red-hot steel',
      ],
      carriesLantern: true,
      color: '#f97316',
      facingAngle: 0,
      dialogue: [
        'My smithy stands by the western millstream—bring me gold and I will temper your gear to perfection!',
        'Step inside my forge anytime to inspect the weapon racks and furnace.',
      ],
    },
    {
      id: 'npc-shop',
      name: 'Merchant Garrick',
      title: 'Purveyor of Curios & Elixirs',
      role: 'shop',
      ...wp(51, 48),
      homePos: wp(79, 44),
      waypoints: [wp(51, 48), wp(66, 47), wp(78, 49), wp(79, 44), wp(52, 47)],
      currentWaypointIdx: 0,
      moveSpeed: 41,
      waitTimer: 3.2,
      activityText: 'Appraising rare dungeon relics',
      activities: [
        'Brewing mana elixirs at the alchemy table',
        'Arranging curio stalls in East Meadow',
        'Cataloging rare gemstones',
        'Offering potions in the plaza',
      ],
      carriesLantern: true,
      color: '#a855f7',
      facingAngle: Math.PI,
      dialogue: [
        'Finest elixirs, enchanted rings, and rare tomes! Visit my East Meadow Emporium or trade right here.',
        'Never descend into the catacombs without a full belt of healing draughts!',
      ],
    },
    {
      id: 'npc-storage',
      name: 'Keeper Brom',
      title: 'Warden of the Ironclad Vault',
      role: 'storage',
      ...wp(45, 48),
      homePos: wp(18, 76),
      waypoints: [wp(45, 48), wp(34, 64), wp(19, 80), wp(18, 76), wp(46, 49)],
      currentWaypointIdx: 0,
      moveSpeed: 36,
      waitTimer: 4.5,
      activityText: 'Guarding the royal strongbox keys',
      activities: [
        'Checking heavy vault locks',
        'Patrolling the southwest stone keep',
        'Logging deposited heirloom chests',
        'Standing watch at the plaza',
      ],
      carriesLantern: true,
      color: '#22c55e',
      facingAngle: 0,
      dialogue: [
        'Your treasures are safe under heavy iron lock in the Southwest Keep, or accessible right here.',
        'Store your spare artifacts before venturing deeper into the abyss.',
      ],
    },
    {
      id: 'npc-guide',
      name: 'Warden Kaelen',
      title: 'Rift Sentinel',
      role: 'guide',
      ...wp(35, 26),
      homePos: wp(33, 25),
      waypoints: [wp(35, 26), wp(39, 34), wp(46, 43), wp(33, 26)],
      currentWaypointIdx: 0,
      moveSpeed: 45,
      waitTimer: 3.0,
      activityText: 'Watching the Abyssal Rift',
      activities: [
        'Monitoring runic containment pillars',
        'Patrolling the northern bridge',
        'Briefing heroes at the plaza',
        'Guarding the Abyssal Portal',
      ],
      carriesLantern: true,
      color: '#ec4899',
      facingAngle: Math.PI / 2,
      dialogue: [
        'The Abyssal Portal lies just behind me on the northern ridge.',
        'Whenever you are ready to delve—or return to a cleared floor—step into the violet rift.',
      ],
    },
    // Wandering Townsfolk & Villagers
    {
      id: 'npc-innkeeper',
      name: 'Innkeeper Barnaby',
      title: 'Host of the Prancing Griffin',
      role: 'villager',
      ...wp(18, 21),
      homePos: wp(17, 15),
      waypoints: [wp(17, 15), wp(18, 21), wp(23, 28), wp(26, 33), wp(23, 28), wp(15, 23)],
      currentWaypointIdx: 0,
      moveSpeed: 40,
      waitTimer: 2.8,
      activityText: 'Polishing oak tankards',
      activities: [
        'Pouring spiced cider by the hearth',
        'Sweeping the tavern porch',
        'Greeting travelers by the river bridge',
        'Tending the roaring tavern fireplace',
      ],
      carriesLantern: true,
      color: '#f59e0b',
      facingAngle: Math.PI / 2,
      dialogue: [
        'Welcome to the Prancing Griffin Inn! Step inside to warm yourself by our stone fireplace.',
        'We have oak tables, soft beds in the east wing, and a view of Silverbrook River!',
      ],
    },
    {
      id: 'npc-weaver',
      name: 'Elara the Weaver',
      title: 'Mistress of Tapestries',
      role: 'villager',
      ...wp(49, 78),
      homePos: wp(49, 77),
      waypoints: [wp(49, 77), wp(49, 64), wp(48, 50), wp(49, 64), wp(49, 81)],
      currentWaypointIdx: 0,
      moveSpeed: 42,
      waitTimer: 2.5,
      activityText: 'Strolling beside Mirror Lake',
      activities: [
        'Weaving royal banners indoors',
        'Resting on the lakeside bench',
        'Admiring the water lilies on Mirror Lake',
        'Visiting the central fountain',
      ],
      carriesLantern: true,
      color: '#f472b6',
      facingAngle: 0,
      dialogue: [
        'Have you walked down to Emerald Mirror Lake? The water lilies and ripples are so peaceful.',
        'My cottage is just south of the lake—feel free to come inside and see the tapestries!',
      ],
    },
    {
      id: 'npc-miller',
      name: 'Miller Cedric',
      title: 'Keeper of the Orchard',
      role: 'villager',
      ...wp(78, 77),
      homePos: wp(78, 76),
      waypoints: [wp(78, 76), wp(76, 62), wp(78, 50), wp(76, 62), wp(79, 80)],
      currentWaypointIdx: 0,
      moveSpeed: 41,
      waitTimer: 3.0,
      activityText: 'Harvesting orchard apples',
      activities: [
        'Stacking grain barrels in the homestead',
        'Resting by the orchard well',
        'Trading flour at East Meadow market',
        'Walking the southern lakeside trail',
      ],
      carriesLantern: true,
      color: '#84cc16',
      facingAngle: Math.PI,
      dialogue: [
        'The soil in the southeast orchard glade is the richest in the realm.',
        'With the houses spread far across the valley, everyone has plenty of open meadow to breathe!',
      ],
    },
    {
      id: 'npc-bard',
      name: 'Lyra the Minstrel',
      title: 'Wandering Lute Player',
      role: 'villager',
      ...wp(46, 44),
      homePos: wp(19, 15),
      waypoints: [wp(46, 44), wp(35, 38), wp(26, 33), wp(19, 22), wp(26, 33), wp(35, 38), wp(52, 47)],
      currentWaypointIdx: 0,
      moveSpeed: 46,
      waitTimer: 2.6,
      activityText: 'Playing a ballad by the fountain',
      activities: [
        'Strumming a melody on her lute',
        'Singing by the Silverbrook bridge',
        'Performing inside the Griffin Tavern',
        'Composing verses by Mirror Lake',
      ],
      carriesLantern: true,
      color: '#c084fc',
      facingAngle: Math.PI / 2,
      dialogue: [
        'From dawn’s rose glow to starlit night, Oakridge Valley is a song waiting to be sung!',
        'Follow the winding stone paths—every bridge and bench has a view worth savoring.',
      ],
    },
  ];

  // Spawn player just south of the Central Sanctuary Fountain
  const playerSpawn = map.tileToWorldCenter(48, 49);

  // 10. Precompute flat O(1) typed arrays for zero-allocation rendering & minimap
  const totalTiles = width * height;
  const tileFlags = new Uint8Array(totalTiles);
  const wallBuildingIdx = new Int16Array(totalTiles);
  wallBuildingIdx.fill(-1);

  const buildingIdToIndex = new Map<string, number>();
  buildings.forEach((b, idx) => buildingIdToIndex.set(b.id, idx));

  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const idx = ty * width + tx;
      const key = `${tx},${ty}`;
      let flags = 0;

      if (
        tx === 0 ||
        ty === 0 ||
        tx === width - 1 ||
        ty === height - 1 ||
        treeKeySet.has(key)
      ) {
        flags |= TOWN_TILE_FLAG_TREE;
      }
      if (roadTiles.has(key)) {
        flags |= TOWN_TILE_FLAG_ROAD;
      }
      const intStyle = interiorTiles.get(key);
      if (intStyle === 'oak_planks') flags |= TOWN_TILE_FLAG_INTERIOR_OAK;
      else if (intStyle === 'stone_flag') flags |= TOWN_TILE_FLAG_INTERIOR_STONE;
      else if (intStyle === 'royal_carpet') flags |= TOWN_TILE_FLAG_INTERIOR_CARPET;

      if (map.get(tx, ty) === TileType.Wall) {
        let isPerim = false;
        for (let dy = -1; dy <= 1 && !isPerim; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = tx + dx;
            const ny = ty + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nb = map.get(nx, ny);
            if (nb !== TileType.Wall && nb !== TileType.Empty) {
              isPerim = true;
              break;
            }
          }
        }
        if (isPerim) flags |= TOWN_TILE_FLAG_PERIMETER_WALL;

        const wMeta = buildingWallMap.get(key);
        if (wMeta) {
          wallBuildingIdx[idx] = buildingIdToIndex.get(wMeta.buildingId) ?? -1;
          if (wMeta.isFrontWall) flags |= TOWN_TILE_FLAG_FRONT_WALL;
          if (wMeta.isWindow) flags |= TOWN_TILE_FLAG_WINDOW;
        }
      }

      tileFlags[idx] = flags;
    }
  }

  // 11. Build 8x8-tile Spatial Partitioning Grid (TownSpatialIndex) for O(1) viewport chunk culling
  const chunkTiles = 8;
  const chunkCols = Math.ceil(width / chunkTiles);
  const chunkRows = Math.ceil(height / chunkTiles);
  const chunks: TownSpatialChunk[] = Array.from({ length: chunkCols * chunkRows }, () => ({
    props: [],
    rugs: [],
    perimeterWalls: [],
    buildingIndices: [],
  }));

  // Partition perimeter walls & trees into spatial chunks
  for (let ty = 0; ty < height; ty++) {
    const cy = Math.min(chunkRows - 1, ty >> 3);
    const rowOff = ty * width;
    for (let tx = 0; tx < width; tx++) {
      if ((tileFlags[rowOff + tx] & TOWN_TILE_FLAG_PERIMETER_WALL) !== 0) {
        const cx = Math.min(chunkCols - 1, tx >> 3);
        chunks[cy * chunkCols + cx].perimeterWalls.push((ty << 16) | tx);
      }
    }
  }

  // Partition props & rugs into spatial chunks and tag indoor props with their enclosing building index
  for (const prop of props) {
    const pt = map.worldToTile(prop.x, prop.y);
    const cx = Math.max(0, Math.min(chunkCols - 1, pt.x >> 3));
    const cy = Math.max(0, Math.min(chunkRows - 1, pt.y >> 3));
    let bIdx = -1;
    for (let i = 0; i < buildings.length; i++) {
      if (isTileInBuilding(pt.x, pt.y, buildings[i])) {
        bIdx = i;
        break;
      }
    }
    const tagged: TaggedDungeonProp = { prop, buildingIdx: bIdx };
    if (prop.kind === 'rug') {
      chunks[cy * chunkCols + cx].rugs.push(tagged);
    } else {
      chunks[cy * chunkCols + cx].props.push(tagged);
    }
  }

  // Partition buildings into overlapped spatial chunks (with 2-tile roof/turret overhang margin)
  for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
    const b = buildings[bIdx];
    const minTx = Math.max(0, Math.min(b.x, b.wing ? b.wing.x : b.x) - 2);
    const maxTx = Math.min(width - 1, Math.max(b.x + b.w, b.wing ? b.wing.x + b.wing.w : b.x + b.w) + 2);
    const minTy = Math.max(0, Math.min(b.y, b.wing ? b.wing.y : b.y) - 2);
    const maxTy = Math.min(height - 1, Math.max(b.y + b.h, b.wing ? b.wing.y + b.wing.h : b.y + b.h) + 2);

    const cMinX = minTx >> 3;
    const cMaxX = Math.min(chunkCols - 1, maxTx >> 3);
    const cMinY = minTy >> 3;
    const cMaxY = Math.min(chunkRows - 1, maxTy >> 3);
    for (let cy = cMinY; cy <= cMaxY; cy++) {
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        chunks[cy * chunkCols + cx].buildingIndices.push(bIdx);
      }
    }
  }

  const spatialIndex: TownSpatialIndex = {
    chunkTiles,
    cols: chunkCols,
    rows: chunkRows,
    chunks,
  };

  return {
    map,
    playerSpawn,
    fountainPos,
    dungeonPortalPos,
    npcs,
    props,
    buildings,
    roadTiles,
    interiorTiles,
    treeTiles,
    treeSet: treeKeySet,
    buildingWallMap,
    tileFlags,
    wallBuildingIdx,
    spatialIndex,
  };
}
