import { TileType, TileCoord, WorldCoord, ZoneDef, SpawnPoint, SpawnKind } from './types';
import { Result } from './items';

export type { TileCoord, WorldCoord, ZoneDef, SpawnPoint };
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

  // Check if a circular body (cx, cy, radius) intersects any non-walkable tile
  isCircleWalkable(cx: number, cy: number, radius: number): boolean {
    const minTileX = Math.floor((cx - radius - this.originX) / this.tileSize);
    const maxTileX = Math.floor((cx + radius - this.originX) / this.tileSize);
    const minTileY = Math.floor((cy - radius - this.originY) / this.tileSize);
    const maxTileY = Math.floor((cy + radius - this.originY) / this.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = this.get(tx, ty);
        if (!TileFlags.isWalkable(tile)) {
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

  // Smooth continuous collision and wall-sliding resolution
  resolveCircleMovement(
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    radius: number
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
          if (!TileFlags.isWalkable(tile)) {
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
          if (!TileFlags.isWalkable(tile)) {
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
        if (!TileFlags.isWalkable(tile)) {
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

  // Add decorative/hazard tiles (Pits, Lava pools in deeper floors, Water pools in early floors)
  for (let r = 1; r < rooms.length - 1; r++) {
    const room = rooms[r];
    // Keep centers and exits clear so navigation is always safe
    if (r === 1 && rooms.length > 2) {
      // Water pool room with slowdown
      for (let hx = room.x + 1; hx < room.x + room.w - 1; hx++) {
        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy++) {
          if (hx !== room.centerX && hy !== room.centerY && Math.random() > 0.45) {
            map.set(hx, hy, TileType.Water);
          }
        }
      }
    } else if (r === 2 && floorNumber >= 2) {
      // Lava pool room with burning hazards
      for (let hx = room.x + 1; hx < room.x + room.w - 1; hx++) {
        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy++) {
          if (hx !== room.centerX && hy !== room.centerY && Math.random() > 0.5) {
            map.set(hx, hy, TileType.Lava);
          }
        }
      }
    } else if (r >= 3 && Math.random() > 0.4) {
      // Chasm / Pit pockets along corners (impassable void)
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.h - 2 },
      ];
      for (const c of corners) {
        map.set(c.x, c.y, TileType.Pit);
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

