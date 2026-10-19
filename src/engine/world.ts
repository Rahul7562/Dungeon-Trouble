import {
  TileType,
  TileCoord,
  WorldCoord,
  ZoneDef,
  SpawnPoint,
  SpawnKind,
  DungeonProp,
  DungeonPropKind,
} from './types';
import { Result } from './items';

export type { TileCoord, WorldCoord, ZoneDef, SpawnPoint, DungeonProp, DungeonPropKind };
export { TileType, SpawnKind, Result };

export const TileFlags = {
  isWalkable(type: TileType): boolean {
    return (
      type === TileType.Floor ||
      type === TileType.Exit ||
      type === TileType.Water ||
      type === TileType.Lava
    );
  },
  blocksProjectiles(type: TileType): boolean {
    return type === TileType.Wall || type === TileType.Chest;
  },
  isHazard(type: TileType): boolean {
    return type === TileType.Pit || type === TileType.Water || type === TileType.Lava;
  },
  IsWalkable(type: TileType): boolean {
    return type === TileType.Floor;
  },
  BlocksProjectiles(type: TileType): boolean {
    return type === TileType.Wall;
  },
  IsHazard(type: TileType): boolean {
    return type === TileType.Pit || type === TileType.Water || type === TileType.Lava;
  },
};

export class TileMap {
  width: number;
  height: number;
  tileSize: number;
  originX: number;
  originY: number;
  tiles: TileType[];

  constructor(width: number, height: number, tileSize = 64, originX = 0, originY = 0) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.originX = originX;
    this.originY = originY;
    this.tiles = new Array(width * height).fill(TileType.Wall);
  }

  GetWidth(): number { return this.width; }
  GetHeight(): number { return this.height; }

  get(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TileType.Wall;
    }
    return this.tiles[y * this.width + x];
  }

  set(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y * this.width + x] = type;
    }
  }

  Get(x: number, y: number): TileType { return this.get(x, y); }
  Set(x: number, y: number, type: TileType): void { this.set(x, y, type); }

  worldToTile(wx: number, wy: number): TileCoord {
    const relX = wx - this.originX;
    const relY = wy - this.originY;
    return {
      x: Math.floor(relX / this.tileSize),
      y: Math.floor(relY / this.tileSize),
    };
  }

  tileToWorldCenter(tx: number, ty: number): WorldCoord {
    return {
      x: this.originX + tx * this.tileSize + this.tileSize * 0.5,
      y: this.originY + ty * this.tileSize + this.tileSize * 0.5,
    };
  }

  WorldToTile(wx: number, wy: number): TileCoord { return this.worldToTile(wx, wy); }
  TileToWorldCenter(tx: number, ty: number): WorldCoord { return this.tileToWorldCenter(tx, ty); }

  // Check if a circular body (cx, cy, radius) intersects any non-walkable tile (or water when forbidWater is true)
  isCircleWalkable(cx: number, cy: number, radius: number, forbidWater = false): boolean {
    const minTileX = Math.floor((cx - radius - this.originX) / this.tileSize);
    const maxTileX = Math.floor((cx + radius - this.originX) / this.tileSize);
    const minTileY = Math.floor((cy - radius - this.originY) / this.tileSize);
    const maxTileY = Math.floor((cy + radius - this.originY) / this.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = this.get(tx, ty);
        const blocked = forbidWater
          ? tile !== TileType.Floor && tile !== TileType.Exit
          : !TileFlags.isWalkable(tile);
        if (blocked) {
          // AABB vs Circle test
          const tileMinX = this.originX + tx * this.tileSize;
          const tileMaxX = tileMinX + this.tileSize;
          const tileMinY = this.originY + ty * this.tileSize;
          const tileMaxY = tileMinY + this.tileSize;

          const closestX = Math.max(tileMinX, Math.min(cx, tileMaxX));
          const closestY = Math.max(tileMinY, Math.min(cy, tileMaxY));

          const distX = cx - closestX;
          const distY = cy - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Snap any world coordinate to the nearest dry walkable Floor tile center that is clear of Water and Walls
  findNearestDryWorldPos(wx: number, wy: number, radius = 14): { x: number; y: number } {
    if (this.isCircleWalkable(wx, wy, radius, true)) {
      return { x: wx, y: wy };
    }
    const startTile = this.worldToTile(wx, wy);
    for (let r = 1; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = startTile.x + dx;
          const ty = startTile.y + dy;
          if (this.get(tx, ty) === TileType.Floor) {
            const center = this.tileToWorldCenter(tx, ty);
            if (this.isCircleWalkable(center.x, center.y, radius, true)) {
              return center;
            }
          }
        }
      }
    }
    return { x: wx, y: wy };
  }

  // Smooth continuous collision and wall-sliding resolution (strictly blocks Water when forbidWater = true)
  resolveCircleMovement(
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    radius: number,
    forbidWater = false
  ): { x: number; y: number } {
    let currentX = cx;
    let currentY = cy;
    const skin = 0.01;

    // 1. Resolve X axis
    if (dx !== 0) {
      let nextX = currentX + dx;
      const minTx = Math.floor((Math.min(currentX, nextX) - radius - this.originX) / this.tileSize);
      const maxTx = Math.floor((Math.max(currentX, nextX) + radius - this.originX) / this.tileSize);
      const minTy = Math.floor((currentY - radius - this.originY) / this.tileSize);
      const maxTy = Math.floor((currentY + radius - this.originY) / this.tileSize);

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          const tile = this.get(tx, ty);
          const blocked = forbidWater
            ? tile !== TileType.Floor && tile !== TileType.Exit
            : !TileFlags.isWalkable(tile);
          if (blocked) {
            const tileMinX = this.originX + tx * this.tileSize;
            const tileMaxX = tileMinX + this.tileSize;
            const tileMinY = this.originY + ty * this.tileSize;
            const tileMaxY = tileMinY + this.tileSize;

            const closestY = Math.max(tileMinY, Math.min(currentY, tileMaxY));
            const distY = currentY - closestY;
            if (distY * distY < radius * radius) {
              const allowedDistX = Math.sqrt(Math.max(0, radius * radius - distY * distY));
              if (dx > 0 && currentX <= tileMinX && nextX + allowedDistX > tileMinX) {
                nextX = Math.min(nextX, tileMinX - allowedDistX - skin);
              } else if (dx < 0 && currentX >= tileMaxX && nextX - allowedDistX < tileMaxX) {
                nextX = Math.max(nextX, tileMaxX + allowedDistX + skin);
              }
            }
          }
        }
      }
      currentX = nextX;
    }

    // 2. Resolve Y axis
    if (dy !== 0) {
      let nextY = currentY + dy;
      const minTx = Math.floor((currentX - radius - this.originX) / this.tileSize);
      const maxTx = Math.floor((currentX + radius - this.originX) / this.tileSize);
      const minTy = Math.floor((Math.min(currentY, nextY) - radius - this.originY) / this.tileSize);
      const maxTy = Math.floor((Math.max(currentY, nextY) + radius - this.originY) / this.tileSize);

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          const tile = this.get(tx, ty);
          const blocked = forbidWater
            ? tile !== TileType.Floor && tile !== TileType.Exit
            : !TileFlags.isWalkable(tile);
          if (blocked) {
            const tileMinX = this.originX + tx * this.tileSize;
            const tileMaxX = tileMinX + this.tileSize;
            const tileMinY = this.originY + ty * this.tileSize;
            const tileMaxY = tileMinY + this.tileSize;

            const closestX = Math.max(tileMinX, Math.min(currentX, tileMaxX));
            const distX = currentX - closestX;
            if (distX * distX < radius * radius) {
              const allowedDistY = Math.sqrt(Math.max(0, radius * radius - distX * distX));
              if (dy > 0 && currentY <= tileMinY && nextY + allowedDistY > tileMinY) {
                nextY = Math.min(nextY, tileMinY - allowedDistY - skin);
              } else if (dy < 0 && currentY >= tileMaxY && nextY - allowedDistY < tileMaxY) {
                nextY = Math.max(nextY, tileMaxY + allowedDistY + skin);
              }
            }
          }
        }
      }
      currentY = nextY;
    }

    // 3. Post-resolve any diagonal corner penetration / pinch
    const checkMinTx = Math.floor((currentX - radius - this.originX) / this.tileSize);
    const checkMaxTx = Math.floor((currentX + radius - this.originX) / this.tileSize);
    const checkMinTy = Math.floor((currentY - radius - this.originY) / this.tileSize);
    const checkMaxTy = Math.floor((currentY + radius - this.originY) / this.tileSize);

    for (let ty = checkMinTy; ty <= checkMaxTy; ty++) {
      for (let tx = checkMinTx; tx <= checkMaxTx; tx++) {
        const tile = this.get(tx, ty);
        const blocked = forbidWater
          ? tile !== TileType.Floor && tile !== TileType.Exit
          : !TileFlags.isWalkable(tile);
        if (blocked) {
          const tileMinX = this.originX + tx * this.tileSize;
          const tileMaxX = tileMinX + this.tileSize;
          const tileMinY = this.originY + ty * this.tileSize;
          const tileMaxY = tileMinY + this.tileSize;

          const closestX = Math.max(tileMinX, Math.min(currentX, tileMaxX));
          const closestY = Math.max(tileMinY, Math.min(currentY, tileMaxY));
          const distX = currentX - closestX;
          const distY = currentY - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const push = (radius - dist) + skin;
              currentX += (distX / dist) * push;
              currentY += (distY / dist) * push;
            } else {
              // Exact center inside tile, push toward open space
              currentX += (dx !== 0 ? -Math.sign(dx) : 1) * skin;
              currentY += (dy !== 0 ? -Math.sign(dy) : 1) * skin;
            }
          }
        }
      }
    }

    return { x: currentX, y: currentY };
  }

  // Check if line of sight between two points is clear of projectile blockers
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number, step = 16): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.floor(dist / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const tile = this.worldToTile(px, py);
      if (TileFlags.blocksProjectiles(this.get(tile.x, tile.y))) {
        return false;
      }
    }
    return true;
  }
}

export interface DungeonRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
  roomType?: 'spawn' | 'combat' | 'treasure' | 'shrine' | 'boss';
}

export interface DungeonThemeConfig {
  id: 'forgotten_catacombs' | 'frozen_depths' | 'corrupted_temple' | 'ember_crypt';
  name: string;
  floorPrimary: string;
  floorSecondary: string;
  floorBorder: string;
  wallLeft: string;
  wallRight: string;
  wallTop: string;
  wallBorder: string;
  ambientLightColor: string;
  torchColor: string;
  fogColor: string;
}

export const DUNGEON_THEMES: Record<DungeonThemeConfig['id'], DungeonThemeConfig> = {
  forgotten_catacombs: {
    id: 'forgotten_catacombs',
    name: 'Forgotten Catacombs',
    floorPrimary: '#1a202c',
    floorSecondary: '#151a24',
    floorBorder: '#2d3748',
    wallLeft: '#0f172a',
    wallRight: '#1e293b',
    wallTop: '#334155',
    wallBorder: '#475569',
    ambientLightColor: 'rgba(245, 158, 11, 0.14)',
    torchColor: '#f59e0b',
    fogColor: 'rgba(6, 8, 14, 0.92)',
  },
  frozen_depths: {
    id: 'frozen_depths',
    name: 'Frozen Depths',
    floorPrimary: '#112233',
    floorSecondary: '#0d1b2a',
    floorBorder: '#1e3a5f',
    wallLeft: '#0a192f',
    wallRight: '#172a45',
    wallTop: '#233554',
    wallBorder: '#38bdf8',
    ambientLightColor: 'rgba(56, 189, 248, 0.16)',
    torchColor: '#38bdf8',
    fogColor: 'rgba(4, 12, 24, 0.92)',
  },
  corrupted_temple: {
    id: 'corrupted_temple',
    name: 'Corrupted Temple',
    floorPrimary: '#1e162b',
    floorSecondary: '#171122',
    floorBorder: '#3b2854',
    wallLeft: '#120d1d',
    wallRight: '#241938',
    wallTop: '#352552',
    wallBorder: '#a855f7',
    ambientLightColor: 'rgba(168, 85, 247, 0.16)',
    torchColor: '#c084fc',
    fogColor: 'rgba(10, 5, 18, 0.92)',
  },
  ember_crypt: {
    id: 'ember_crypt',
    name: 'Ember Crypt',
    floorPrimary: '#241414',
    floorSecondary: '#1c0f0f',
    floorBorder: '#451a1a',
    wallLeft: '#180a0a',
    wallRight: '#2c1212',
    wallTop: '#421c1c',
    wallBorder: '#f97316',
    ambientLightColor: 'rgba(249, 115, 22, 0.18)',
    torchColor: '#fb923c',
    fogColor: 'rgba(14, 5, 5, 0.93)',
  },
};

export function getThemeForFloor(floorNumber: number): DungeonThemeConfig {
  if (floorNumber <= 3) return DUNGEON_THEMES.forgotten_catacombs;
  if (floorNumber <= 5) return DUNGEON_THEMES.frozen_depths;
  if (floorNumber <= 7) return DUNGEON_THEMES.corrupted_temple;
  return DUNGEON_THEMES.ember_crypt;
}

export interface GeneratedDungeon {
  map: TileMap;
  playerSpawn: WorldCoord;
  rooms: DungeonRoom[];
  exitTile: TileCoord;
  chestLocations: WorldCoord[];
  theme: DungeonThemeConfig;
  props: DungeonProp[];
  seed: number;
}

export function generateDungeonLevel(floorNumber = 1, seed?: number): GeneratedDungeon {
  const width = 38;
  const height = 38;
  const tileSize = 64;
  const map = new TileMap(width, height, tileSize, 0, 0);
  const theme = getThemeForFloor(floorNumber);

  // Deterministic PRNG when seed is provided, otherwise random seed
  const actualSeed = seed !== undefined ? seed : Math.floor(Math.random() * 0x7fffffff) || (floorNumber * 1337 + 42);
  let rngState = (actualSeed ^ (floorNumber * 0x9e3779b9)) >>> 0;
  if (rngState === 0) rngState = 0x12345678;

  const nextRand01 = (): number => {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return (rngState >>> 0) / 0xffffffff;
  };

  const randInt = (minVal: number, maxVal: number): number => {
    if (minVal >= maxVal) return minVal;
    return minVal + Math.floor(nextRand01() * (maxVal - minVal + 1));
  };

  const rooms: DungeonRoom[] = [];
  const minRoomSize = 5;
  const maxRoomSize = 9;
  const targetRooms = 8 + Math.min(5, floorNumber);

  for (let i = 0; i < targetRooms * 5 && rooms.length < targetRooms; i++) {
    const isBossCandidate = rooms.length === targetRooms - 1;
    const w = isBossCandidate ? 9 : randInt(minRoomSize, maxRoomSize);
    const h = isBossCandidate ? 9 : randInt(minRoomSize, maxRoomSize);
    const x = randInt(2, width - w - 3);
    const y = randInt(2, height - h - 3);

    const newRoom: DungeonRoom = {
      x,
      y,
      w,
      h,
      centerX: Math.floor(x + w / 2),
      centerY: Math.floor(y + h / 2),
    };

    let overlaps = false;
    for (const r of rooms) {
      if (
        newRoom.x - 1 < r.x + r.w &&
        newRoom.x + newRoom.w + 1 > r.x &&
        newRoom.y - 1 < r.y + r.h &&
        newRoom.y + newRoom.h + 1 > r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
      for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
        for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
          map.set(rx, ry, TileType.Floor);
        }
      }
    }
  }

  // Fallback guarantee: ensure at least 3 rooms exist
  if (rooms.length < 3) {
    const fallbackSpecs = [
      { x: 3, y: 3, w: 6, h: 6 },
      { x: 15, y: 15, w: 7, h: 7 },
      { x: 26, y: 26, w: 8, h: 8 },
    ];
    for (const spec of fallbackSpecs) {
      if (rooms.length >= 3) break;
      const r: DungeonRoom = {
        ...spec,
        centerX: Math.floor(spec.x + spec.w / 2),
        centerY: Math.floor(spec.y + spec.h / 2),
      };
      rooms.push(r);
      for (let rx = r.x; rx < r.x + r.w; rx++) {
        for (let ry = r.y; ry < r.y + r.h; ry++) {
          map.set(rx, ry, TileType.Floor);
        }
      }
    }
  }

  // Sort rooms by distance from first room so progression from start -> boss is natural
  const startOrigin = rooms[0];
  const restRooms = rooms.slice(1).sort((a, b) => {
    const da = Math.hypot(a.centerX - startOrigin.centerX, a.centerY - startOrigin.centerY);
    const db = Math.hypot(b.centerX - startOrigin.centerX, b.centerY - startOrigin.centerY);
    return da - db;
  });
  rooms.length = 0;
  rooms.push(startOrigin, ...restRooms);

  // Assign room types
  rooms[0].roomType = 'spawn';
  rooms[rooms.length - 1].roomType = 'boss';
  for (let i = 1; i < rooms.length - 1; i++) {
    rooms[i].roomType = i === Math.floor(rooms.length / 2) ? 'treasure' : 'combat';
  }

  // Connect rooms with 2-wide L-shaped corridors so navigation is never blocked
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];

    const startX = Math.min(prev.centerX, curr.centerX);
    const endX = Math.max(prev.centerX, curr.centerX);
    for (let cx = startX; cx <= endX; cx++) {
      map.set(cx, prev.centerY, TileType.Floor);
      if (prev.centerY + 1 < height - 1) {
        map.set(cx, prev.centerY + 1, TileType.Floor);
      }
    }

    const startY = Math.min(prev.centerY, curr.centerY);
    const endY = Math.max(prev.centerY, curr.centerY);
    for (let cy = startY; cy <= endY; cy++) {
      map.set(curr.centerX, cy, TileType.Floor);
      if (curr.centerX + 1 < width - 1) {
        map.set(curr.centerX + 1, cy, TileType.Floor);
      }
    }
  }

  // Add theme-appropriate environmental hazards while keeping room centers & corridors clear
  for (let r = 1; r < rooms.length - 1; r++) {
    const room = rooms[r];
    if (theme.id === 'frozen_depths' || (r === 1 && rooms.length > 2)) {
      for (let hx = room.x + 1; hx < room.x + room.w - 1; hx++) {
        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy++) {
          if (Math.abs(hx - room.centerX) > 1 && Math.abs(hy - room.centerY) > 1 && nextRand01() > 0.45) {
            map.set(hx, hy, TileType.Water);
          }
        }
      }
    } else if (theme.id === 'ember_crypt' || (r === 2 && floorNumber >= 2)) {
      for (let hx = room.x + 1; hx < room.x + room.w - 1; hx++) {
        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy++) {
          if (Math.abs(hx - room.centerX) > 1 && Math.abs(hy - room.centerY) > 1 && nextRand01() > 0.5) {
            map.set(hx, hy, TileType.Lava);
          }
        }
      }
    } else if (r >= 2 && nextRand01() > 0.4) {
      // Corner chasm pits away from corridor axes
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
      ];
      for (const c of corners) {
        if (Math.abs(c.x - room.centerX) > 1 && Math.abs(c.y - room.centerY) > 1) {
          map.set(c.x, c.y, TileType.Pit);
        }
      }
    }
  }

  // First room is player spawn
  const startRoom = rooms[0];
  const playerSpawn = map.tileToWorldCenter(startRoom.centerX, startRoom.centerY);

  // Last room has dungeon exit portal
  const lastRoom = rooms[rooms.length - 1];
  map.set(lastRoom.centerX, lastRoom.centerY, TileType.Exit);
  const exitTile = { x: lastRoom.centerX, y: lastRoom.centerY };

  // Place chests in intermediate rooms on guaranteed walkable tiles
  const chestLocations: WorldCoord[] = [];
  for (let r = 1; r < rooms.length - 1; r++) {
    if (nextRand01() > 0.35 || rooms[r].roomType === 'treasure') {
      const room = rooms[r];
      const cx = room.x + 1;
      const cy = room.y + room.h - 2;
      if (cx !== room.centerX || cy !== room.centerY) {
        map.set(cx, cy, TileType.Chest);
        chestLocations.push(map.tileToWorldCenter(cx, cy));
      }
    }
  }

  // Generate handcrafted environmental storytelling props & light sources
  const props: DungeonProp[] = [];
  const occupiedTiles = new Set<string>();
  occupiedTiles.add(`${startRoom.centerX},${startRoom.centerY}`);
  occupiedTiles.add(`${lastRoom.centerX},${lastRoom.centerY}`);
  let propIdCounter = 1;

  const tryAddProp = (
    tx: number,
    ty: number,
    kind: DungeonPropKind,
    opts?: {
      offsetX?: number;
      offsetY?: number;
      lightColor?: string;
      lightRadius?: number;
      variant?: number;
    }
  ) => {
    const key = `${tx},${ty}`;
    if (occupiedTiles.has(key)) return;
    if (map.get(tx, ty) !== TileType.Floor) return;
    occupiedTiles.add(key);
    const wc = map.tileToWorldCenter(tx, ty);
    props.push({
      id: `prop-${propIdCounter++}`,
      kind,
      x: wc.x + (opts?.offsetX ?? 0),
      y: wc.y + (opts?.offsetY ?? 0),
      solid: false,
      radius: 14,
      variant: opts?.variant ?? ((tx * 7 + ty * 13) % 4),
      lightColor: opts?.lightColor,
      lightRadius: opts?.lightRadius,
    });
  };

  for (let r = 0; r < rooms.length; r++) {
    const room = rooms[r];
    const isBossRoom = room.roomType === 'boss';
    const isTreasureRoom = room.roomType === 'treasure';

    // 1. Primary corner light sources (braziers, crystals, or ritual altars)
    const primaryLightKind: DungeonPropKind =
      theme.id === 'frozen_depths'
        ? 'crystal'
        : theme.id === 'corrupted_temple'
        ? 'altar'
        : 'brazier';

    const corners = [
      { tx: room.x, ty: room.y },
      { tx: room.x + room.w - 1, ty: room.y },
      { tx: room.x, ty: room.y + room.h - 1 },
    ];
    for (const c of corners) {
      tryAddProp(c.tx, c.ty, primaryLightKind, {
        lightColor: theme.torchColor,
        lightRadius: isBossRoom ? 230 : 195,
      });
    }

    // 2. Wall-mounted torches and tattered banners along north/west walls
    const midNorthX = room.centerX - 1;
    if (midNorthX > room.x && map.get(midNorthX, room.y - 1) === TileType.Wall) {
      tryAddProp(midNorthX, room.y, 'torch', {
        offsetY: -18,
        lightColor: '#fb923c',
        lightRadius: 175,
      });
    }
    const midNorthX2 = room.centerX + 1;
    if (midNorthX2 < room.x + room.w - 1 && map.get(midNorthX2, room.y - 1) === TileType.Wall) {
      tryAddProp(midNorthX2, room.y, r % 2 === 0 ? 'banner' : 'chains', {
        offsetY: -16,
      });
    }

    // 3. Corner cobwebs in upper/side corners
    if (r % 2 === 1) {
      tryAddProp(room.x + room.w - 1, room.y + 1, 'cobweb', {
        offsetX: 12,
        offsetY: -10,
      });
    }

    // 4. Architectural landmarks & room-specific props (pillars, statues, sarcophagi, barrels, crates, bones)
    if (isBossRoom) {
      // Grand Boss Chamber symmetry: 4 pillars/statues framing the arena
      tryAddProp(room.x + 1, room.y + 1, 'statue');
      tryAddProp(room.x + room.w - 2, room.y + 1, 'statue');
      tryAddProp(room.x + 1, room.y + room.h - 2, 'pillar');
      tryAddProp(room.x + room.w - 2, room.y + room.h - 2, 'pillar');
      tryAddProp(room.centerX, room.y + 1, 'arch');
    } else if (isTreasureRoom) {
      // Treasure vault: crates, barrels, ancient statue, and ritual altar
      tryAddProp(room.x + 2, room.y + room.h - 2, 'crate');
      tryAddProp(room.x + room.w - 2, room.y + room.h - 2, 'barrel');
      tryAddProp(room.x + room.w - 2, room.y + 1, 'statue');
    } else {
      // Combat & Spawn chambers: varied dark-fantasy clutter
      const southEastTx = room.x + room.w - 1;
      const southEastTy = room.y + room.h - 1;
      const clusterPool: DungeonPropKind[] =
        theme.id === 'forgotten_catacombs'
          ? ['sarcophagus', 'bones', 'barrel', 'pillar']
          : theme.id === 'frozen_depths'
          ? ['crystal', 'statue', 'rubble', 'crate']
          : theme.id === 'corrupted_temple'
          ? ['pillar', 'statue', 'sarcophagus', 'bones']
          : ['brazier', 'chains', 'bones', 'rubble'];

      const chosenMain = clusterPool[r % clusterPool.length];
      tryAddProp(southEastTx, southEastTy, chosenMain);

      // Secondary prop on opposite side edge
      const sideTx = room.x;
      const sideTy = room.y + Math.floor(room.h / 2);
      const secondaryKind: DungeonPropKind =
        r % 3 === 0 ? 'barrel' : r % 3 === 1 ? 'bones' : 'crate';
      tryAddProp(sideTx, sideTy, secondaryKind, { offsetX: -8 });

      // Large rooms get an interior structural column or broken arch
      if (room.w >= 7 && room.h >= 7) {
        const pillarTx = room.x + room.w - 2;
        const pillarTy = room.y + room.h - 2;
        tryAddProp(pillarTx, pillarTy, r % 2 === 0 ? 'pillar' : 'rubble');
      }
    }
  }

  return {
    map,
    playerSpawn,
    rooms,
    exitTile,
    chestLocations,
    theme,
    props,
    seed: actualSeed,
  };
}

export class ZoneLoader {
  static LoadFromText(text: string): Result<ZoneDef> {
    const lines = text.split('\n');
    let lineIdx = 0;

    // Line 1: zone <id> <name>
    if (lineIdx >= lines.length) return Result.Error('Line 1: Missing zone definition');
    const line1 = lines[lineIdx++].trim();
    const parts1 = line1.split(/\s+/);
    if (parts1[0] !== 'zone') return Result.Error('Line 1: Expected \'zone\'');
    const id = parseInt(parts1[1], 10);
    if (isNaN(id)) return Result.Error('Line 1: Invalid zone id');
    if (!parts1[2]) return Result.Error('Line 1: Missing zone name');
    const name = parts1[2];

    // Line 2: size <width> <height>
    if (lineIdx >= lines.length) return Result.Error('Line 2: Missing size definition');
    const line2 = lines[lineIdx++].trim();
    const parts2 = line2.split(/\s+/);
    if (parts2[0] !== 'size') return Result.Error('Line 2: Expected \'size\'');
    const width = parseInt(parts2[1], 10);
    const height = parseInt(parts2[2], 10);
    if (isNaN(width)) return Result.Error('Line 2: Invalid width');
    if (isNaN(height)) return Result.Error('Line 2: Invalid height');

    // Line 3: tilesize <tileSize> <originX> <originY>
    if (lineIdx >= lines.length) return Result.Error('Line 3: Missing tilesize definition');
    const line3 = lines[lineIdx++].trim();
    const parts3 = line3.split(/\s+/);
    if (parts3[0] !== 'tilesize') return Result.Error('Line 3: Expected \'tilesize\'');
    const tileSize = parseFloat(parts3[1]);
    const originX = parseFloat(parts3[2]);
    const originY = parseFloat(parts3[3]);
    if (isNaN(tileSize)) return Result.Error('Line 3: Invalid tileSize');
    if (isNaN(originX)) return Result.Error('Line 3: Invalid originX');
    if (isNaN(originY)) return Result.Error('Line 3: Invalid originY');

    const tiles = new TileMap(width, height, tileSize, originX, originY);

    // Map rows
    for (let y = 0; y < height; ++y) {
      if (lineIdx >= lines.length) return Result.Error(`Line ${lineIdx + 1}: Missing map row`);
      const rowLine = lines[lineIdx++];
      const currentLineNum = lineIdx;

      let parsedChars = 0;
      for (let c = 0; c < rowLine.length; c++) {
        const ch = rowLine[c];
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        if (parsedChars >= width) break;

        let type: TileType;
        switch (ch) {
          case '.': type = TileType.Floor; break;
          case '#': type = TileType.Wall; break;
          case '_': type = TileType.Empty; break;
          case 'P': type = TileType.Pit; break;
          case 'W': type = TileType.Water; break;
          case 'L': type = TileType.Lava; break;
          default: return Result.Error(`Line ${currentLineNum}: Unknown tile char '${ch}'`);
        }
        tiles.Set(parsedChars, y, type);
        parsedChars++;
      }
      if (parsedChars < width) {
        return Result.Error(`Line ${currentLineNum}: Row too short`);
      }
    }

    const spawnIds = new Set<number>();
    const spawns: SpawnPoint[] = [];

    // Spawns
    while (lineIdx < lines.length) {
      const line = lines[lineIdx++];
      const currentLineNum = lineIdx;
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/\s+/);
      if (parts[0] !== 'spawn') return Result.Error(`Line ${currentLineNum}: Expected 'spawn'`);

      const spawnId = parseInt(parts[1], 10);
      const kindStr = parts[2];
      const tileX = parseInt(parts[3], 10);
      const tileY = parseInt(parts[4], 10);
      const refId = parseInt(parts[5], 10);

      if (isNaN(spawnId) || !kindStr || isNaN(tileX) || isNaN(tileY) || isNaN(refId)) {
        return Result.Error(`Line ${currentLineNum}: Malformed spawn line`);
      }

      if (spawnIds.has(spawnId)) {
        return Result.Error(`Line ${currentLineNum}: Duplicate spawn id ${spawnId}`);
      }
      spawnIds.add(spawnId);

      let kind: SpawnKind;
      if (kindStr === 'player') kind = SpawnKind.PlayerStart;
      else if (kindStr === 'enemy') kind = SpawnKind.Enemy;
      else if (kindStr === 'boss') kind = SpawnKind.Boss;
      else if (kindStr === 'chest') kind = SpawnKind.Chest;
      else return Result.Error(`Line ${currentLineNum}: Unknown spawn kind '${kindStr}'`);

      const wc = tiles.TileToWorldCenter(tileX, tileY);
      spawns.push({
        id: spawnId,
        kind,
        x: wc.x,
        y: wc.y,
        refId,
      });
    }

    return Result.Ok({
      id,
      name,
      tiles,
      spawns,
    });
  }

  static loadFromText = ZoneLoader.LoadFromText;
}

export class ZoneRegistry {
  private zones = new Map<number, ZoneDef>();

  Register(def: ZoneDef): Result<boolean> {
    if (this.zones.has(def.id)) {
      return Result.Error(`Zone with id ${def.id} already registered`);
    }
    this.zones.set(def.id, def);
    return Result.Ok(true);
  }

  Get(id: number): ZoneDef | undefined {
    return this.zones.get(id);
  }

  register = this.Register.bind(this);
  get = this.Get.bind(this);
}

