import { TileType, TileCoord, WorldCoord } from './types';

export const TileFlags = {
  isWalkable(type: TileType): boolean {
    return type === TileType.Floor || type === TileType.Exit;
  },
  blocksProjectiles(type: TileType): boolean {
    return type === TileType.Wall || type === TileType.Chest;
  },
  isHazard(type: TileType): boolean {
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

  // Check if a circular body (cx, cy, radius) intersects any non-walkable tile
  isCircleWalkable(cx: number, cy: number, radius: number): boolean {
    const minTileX = Math.floor((cx - radius) / this.tileSize);
    const maxTileX = Math.floor((cx + radius) / this.tileSize);
    const minTileY = Math.floor((cy - radius) / this.tileSize);
    const maxTileY = Math.floor((cy + radius) / this.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = this.get(tx, ty);
        if (!TileFlags.isWalkable(tile)) {
          // AABB vs Circle test
          const tileMinX = tx * this.tileSize;
          const tileMaxX = tileMinX + this.tileSize;
          const tileMinY = ty * this.tileSize;
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
}

export interface GeneratedDungeon {
  map: TileMap;
  playerSpawn: WorldCoord;
  rooms: DungeonRoom[];
  exitTile: TileCoord;
  chestLocations: WorldCoord[];
}

export function generateDungeonLevel(floorNumber = 1): GeneratedDungeon {
  const width = 36;
  const height = 36;
  const tileSize = 64;
  const map = new TileMap(width, height, tileSize, 0, 0);

  const rooms: DungeonRoom[] = [];
  const minRoomSize = 5;
  const maxRoomSize = 9;
  const maxRooms = 8 + Math.min(6, floorNumber);

  for (let i = 0; i < maxRooms * 3 && rooms.length < maxRooms; i++) {
    const w = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const h = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const x = Math.floor(Math.random() * (width - w - 4)) + 2;
    const y = Math.floor(Math.random() * (height - h - 4)) + 2;

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
      // Carve out room
      for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
        for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
          map.set(rx, ry, TileType.Floor);
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];

    // horizontal corridor
    const startX = Math.min(prev.centerX, curr.centerX);
    const endX = Math.max(prev.centerX, curr.centerX);
    for (let cx = startX; cx <= endX; cx++) {
      map.set(cx, prev.centerY, TileType.Floor);
      map.set(cx, prev.centerY + 1, TileType.Floor); // 2-wide corridors
    }

    // vertical corridor
    const startY = Math.min(prev.centerY, curr.centerY);
    const endY = Math.max(prev.centerY, curr.centerY);
    for (let cy = startY; cy <= endY; cy++) {
      map.set(curr.centerX, cy, TileType.Floor);
      map.set(curr.centerX + 1, cy, TileType.Floor);
    }
  }

  // Add decorative/hazard tiles (lava pool in deeper floors, water pools in early floors)
  if (rooms.length > 2) {
    const hazardRoom = rooms[1];
    const hazardType = floorNumber >= 3 ? TileType.Lava : TileType.Water;
    for (let hx = hazardRoom.x + 1; hx < hazardRoom.x + hazardRoom.w - 1; hx++) {
      for (let hy = hazardRoom.y + 1; hy < hazardRoom.y + hazardRoom.h - 1; hy++) {
        if (Math.random() > 0.6) {
          map.set(hx, hy, hazardType);
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

  // Place chests in rooms
  const chestLocations: WorldCoord[] = [];
  for (let r = 1; r < rooms.length - 1; r++) {
    if (Math.random() > 0.3) {
      const room = rooms[r];
      const cx = room.x + 1;
      const cy = room.y + 1;
      map.set(cx, cy, TileType.Chest);
      chestLocations.push(map.tileToWorldCenter(cx, cy));
    }
  }

  return {
    map,
    playerSpawn,
    rooms,
    exitTile,
    chestLocations,
  };
}
