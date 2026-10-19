import {
  TileType,
  Particle,
  FloatingCombatText,
  LootDropEntity,
  Projectile,
  EnemyEntity,
  ItemRarity,
  BossTelegraph,
  NPCEntity,
  SummonEntity,
  RenderQuality,
  TownBuilding,
  DaylightState,
} from './types';
import { TileMap, DungeonThemeConfig, DungeonProp, DUNGEON_THEMES } from './world';
import {
  GeneratedTown,
  computeDaylightState,
  isPlayerInsideBuilding,
  isTileInBuilding,
  TOWN_TILE_FLAG_TREE,
  TOWN_TILE_FLAG_ROAD,
  TOWN_TILE_FLAG_INTERIOR_OAK,
  TOWN_TILE_FLAG_INTERIOR_STONE,
  TOWN_TILE_FLAG_INTERIOR_CARPET,
  TOWN_TILE_FLAG_PERIMETER_WALL,
  TOWN_TILE_FLAG_FRONT_WALL,
  TOWN_TILE_FLAG_WINDOW,
} from './town';
import { getItemDef } from './items';
import { TileAtlasBank, spatialHash } from './textureAtlas';
import {
  drawHeroRig,
  drawEnemyRig,
  drawNPCRig,
  drawSummonRig,
  HeroRenderState,
  worldAngleToIsoAngle,
} from './characterRigs';

export interface Camera {
  x: number; // Screen space focus target
  y: number;
}

interface DynamicLightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
}

/**
 * Zero-allocation TypedArray SpriteBatcher that batches sub-rectangle draws
 * from a single consolidated Master Texture Sheet (BakedThemeAtlas.masterSheet)
 * to eliminate GPU texture Thrashing and minimize Canvas state switches.
 */
export class SpriteBatcher {
  private sxBuf: Int16Array;
  private syBuf: Int16Array;
  private swBuf: Int16Array;
  private shBuf: Int16Array;
  private dxBuf: Int16Array;
  private dyBuf: Int16Array;
  private alphaBuf: Float32Array;
  private count = 0;
  private capacity: number;

  constructor(capacity = 4096) {
    this.capacity = capacity;
    this.sxBuf = new Int16Array(capacity);
    this.syBuf = new Int16Array(capacity);
    this.swBuf = new Int16Array(capacity);
    this.shBuf = new Int16Array(capacity);
    this.dxBuf = new Int16Array(capacity);
    this.dyBuf = new Int16Array(capacity);
    this.alphaBuf = new Float32Array(capacity);
  }

  clear(): void {
    this.count = 0;
  }

  queue(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    alpha = 1.0
  ): void {
    if (this.count >= this.capacity) return;
    const idx = this.count++;
    this.sxBuf[idx] = sx;
    this.syBuf[idx] = sy;
    this.swBuf[idx] = sw;
    this.shBuf[idx] = sh;
    this.dxBuf[idx] = dx;
    this.dyBuf[idx] = dy;
    this.alphaBuf[idx] = alpha;
  }

  flush(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement): void {
    const n = this.count;
    if (n === 0) return;

    let currentAlpha = 1.0;
    for (let i = 0; i < n; i++) {
      const a = this.alphaBuf[i];
      if (Math.abs(a - currentAlpha) > 0.005) {
        ctx.globalAlpha = a;
        currentAlpha = a;
      }
      const sw = this.swBuf[i];
      const sh = this.shBuf[i];
      ctx.drawImage(
        sheet,
        this.sxBuf[i],
        this.syBuf[i],
        sw,
        sh,
        this.dxBuf[i],
        this.dyBuf[i],
        sw,
        sh
      );
    }
    if (currentAlpha !== 1.0) {
      ctx.globalAlpha = 1.0;
    }
    this.count = 0;
  }
}

export class IsometricRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  public quality: RenderQuality = 'high';

  // Isometric constants: 64 wide x 32 high diamond
  private readonly isoTileW = 64;
  private readonly isoTileH = 32;

  private atlasBank = new TileAtlasBank();
  private spriteBatcher = new SpriteBatcher(4096);
  private shadowQueueX = new Int16Array(2048);
  private shadowQueueY = new Int16Array(2048);
  private shadowQueueKind = new Uint8Array(2048);
  private lightmapCanvas: HTMLCanvasElement | null = null;
  private lightmapCtx: CanvasRenderingContext2D | null = null;
  private lightCutoutSprite: HTMLCanvasElement | null = null;
  private wallShadowNorth: HTMLCanvasElement | null = null;
  private wallShadowWest: HTMLCanvasElement | null = null;
  private wallShadowBoth: HTMLCanvasElement | null = null;
  private buildingRoofAlpha = new Map<string, number>();

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initLightmapCanvas();
    this.initCachedShadowSprites();
  }

  private initLightmapCanvas() {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(this.width * 0.25));
      c.height = Math.max(1, Math.floor(this.height * 0.25));
      const lctx = c.getContext('2d');
      if (lctx) {
        this.lightmapCanvas = c;
        this.lightmapCtx = lctx;
      }

      // Pre-bake reusable 64x64 radial light cutout sprite to avoid per-light createRadialGradient
      const lc = document.createElement('canvas');
      lc.width = 64;
      lc.height = 64;
      const lcCtx = lc.getContext('2d');
      if (lcCtx) {
        const grad = lcCtx.createRadialGradient(32, 32, 3, 32, 32, 32);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.65)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lcCtx.fillStyle = grad;
        lcCtx.beginPath();
        lcCtx.arc(32, 32, 32, 0, Math.PI * 2);
        lcCtx.fill();
        this.lightCutoutSprite = lc;
      }
    }
  }

  private initCachedShadowSprites() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const bakeShadow = (wallNorth: boolean, wallWest: boolean): HTMLCanvasElement | null => {
      const c = document.createElement('canvas');
      c.width = 72;
      c.height = 40;
      const sctx = c.getContext('2d');
      if (!sctx) return null;
      const x = 36;
      const y = 20;
      const hw = 32;
      const hh = 16;

      sctx.save();
      sctx.beginPath();
      sctx.moveTo(x, y - hh);
      sctx.lineTo(x + hw, y);
      sctx.lineTo(x, y + hh);
      sctx.lineTo(x - hw, y);
      sctx.closePath();
      sctx.clip();

      if (wallNorth) {
        const grad = sctx.createLinearGradient(
          x + hw * 0.5,
          y - hh * 0.5,
          x - hw * 0.2,
          y + hh * 0.2
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        sctx.fillStyle = grad;
        sctx.fillRect(x - hw, y - hh, 64, 32);
      }
      if (wallWest) {
        const grad = sctx.createLinearGradient(
          x - hw * 0.5,
          y - hh * 0.5,
          x + hw * 0.2,
          y + hh * 0.2
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        sctx.fillStyle = grad;
        sctx.fillRect(x - hw, y - hh, 64, 32);
      }
      sctx.restore();
      return c;
    };

    this.wallShadowNorth = bakeShadow(true, false);
    this.wallShadowWest = bakeShadow(false, true);
    this.wallShadowBoth = bakeShadow(true, true);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.lightmapCanvas) {
      this.lightmapCanvas.width = Math.max(1, Math.floor(width * 0.25));
      this.lightmapCanvas.height = Math.max(1, Math.floor(height * 0.25));
    }
  }

  worldToScreen(wx: number, wy: number, wz = 0, camera: Camera): { x: number; y: number } {
    const cellX = wx / 64;
    const cellY = wy / 64;
    const screenX = (cellX - cellY) * (this.isoTileW / 2);
    const screenY = (cellX + cellY) * (this.isoTileH / 2) - wz;

    return {
      x: Math.round(screenX - camera.x + this.width / 2),
      y: Math.round(screenY - camera.y + this.height / 2),
    };
  }

  screenToWorld(sx: number, sy: number, camera: Camera): { x: number; y: number } {
    const relX = sx - this.width / 2 + camera.x;
    const relY = sy - this.height / 2 + camera.y;

    const cellX = (relX / (this.isoTileW / 2) + relY / (this.isoTileH / 2)) / 2;
    const cellY = (relY / (this.isoTileH / 2) - relX / (this.isoTileW / 2)) / 2;

    return {
      x: cellX * 64,
      y: cellY * 64,
    };
  }

  // Returns true if a Wall tile borders at least one non-Wall tile in its 3x3 neighborhood
  private isPerimeterWall(map: TileMap, tx: number, ty: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
        const neighbor = map.get(nx, ny);
        if (neighbor !== TileType.Wall && neighbor !== TileType.Empty) {
          return true;
        }
      }
    }
    return false;
  }

  render(
    map: TileMap,
    camera: Camera,
    player: HeroRenderState,
    enemies: EnemyEntity[],
    projectiles: Projectile[],
    lootDrops: LootDropEntity[],
    particles: Particle[],
    floatingTexts: FloatingCombatText[],
    gameTime: number,
    telegraphs: BossTelegraph[] = [],
    npcs: NPCEntity[] = [],
    activeNPC: NPCEntity | null = null,
    summons: SummonEntity[] = [],
    fountainPos: { x: number; y: number } | null = null,
    theme: DungeonThemeConfig = DUNGEON_THEMES.forgotten_catacombs,
    props: DungeonProp[] = [],
    isTown: boolean = false,
    townData?: GeneratedTown,
    worldTimeHours: number = 9.5
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const daylight = computeDaylightState(worldTimeHours);

    // Deep atmospheric background canvas fill (shifts smoothly with time of day in overworld)
    if (isTown && daylight.shadowTintRgb) {
      const [r, g, b] = daylight.shadowTintRgb;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    } else {
      ctx.fillStyle = '#04060b';
    }
    ctx.fillRect(0, 0, this.width, this.height);

    const atlas = this.atlasBank.getAtlas(theme);

    // Compute exact tight tile bounding box from the 4 padded viewport corners to eliminate wasted tile iterations
    const padX = 140;
    const padYTop = 140;
    const padYBot = 175;
    const cNW = map.worldToTile(
      ...(() => {
        const w = this.screenToWorld(-padX, -padYTop, camera);
        return [w.x, w.y] as [number, number];
      })()
    );
    const cNE = map.worldToTile(
      ...(() => {
        const w = this.screenToWorld(this.width + padX, -padYTop, camera);
        return [w.x, w.y] as [number, number];
      })()
    );
    const cSW = map.worldToTile(
      ...(() => {
        const w = this.screenToWorld(-padX, this.height + padYBot, camera);
        return [w.x, w.y] as [number, number];
      })()
    );
    const cSE = map.worldToTile(
      ...(() => {
        const w = this.screenToWorld(this.width + padX, this.height + padYBot, camera);
        return [w.x, w.y] as [number, number];
      })()
    );

    const startX = Math.max(0, Math.min(cNW.x, cNE.x, cSW.x, cSE.x) - 1);
    const endX = Math.min(map.width - 1, Math.max(cNW.x, cNE.x, cSW.x, cSE.x) + 1);
    const startY = Math.max(0, Math.min(cNW.y, cNE.y, cSW.y, cSE.y) - 1);
    const endY = Math.min(map.height - 1, Math.max(cNW.y, cNE.y, cSW.y, cSE.y) + 1);

    const dynamicLights: DynamicLightSource[] = [];
    const tileFlags = townData?.tileFlags;
    const wallBuildingIdx = townData?.wallBuildingIdx;

    // Update smooth per-building roof cutaway alpha
    let activeBuildingIndex = -1;
    if (isTown && townData?.buildings) {
      for (let bIdx = 0; bIdx < townData.buildings.length; bIdx++) {
        const b = townData.buildings[bIdx];
        const inside = isPlayerInsideBuilding(player.x, player.y, map, b);
        if (inside) activeBuildingIndex = bIdx;
        const prevAlpha = this.buildingRoofAlpha.get(b.id) ?? 1.0;
        const targetAlpha = inside ? 0.04 : 1.0;
        const nextAlpha = prevAlpha + (targetAlpha - prevAlpha) * 0.18;
        this.buildingRoofAlpha.set(b.id, nextAlpha);
      }
    }

    // 1. Batched Ground Pass: Floor Tiles, Water, Shorelines, Void Bedrock & Wall-to-Floor Shadows
    // Analytical isometric frustum bounds (tx - ty in [minDiff, maxDiff], tx + ty in [minSum, maxSum])
    // eliminate all off-screen corner tile iterations in the axis-aligned bounding box!
    const mapWidth = map.width;
    const halfW = this.width * 0.5 - camera.x;
    const halfH = this.height * 0.5 - camera.y;
    const minDiff = Math.floor((-96 - halfW) / 32) - 1;
    const maxDiff = Math.ceil((this.width + 96 - halfW) / 32) + 1;
    const minSum = Math.floor((-76 - halfH) / 16) - 2;
    const maxSum = Math.ceil((this.height + 76 - halfH) / 16) + 1;

    this.spriteBatcher.clear();
    let shadowCount = 0;

    for (let ty = startY; ty <= endY; ty++) {
      const rowOffset = ty * mapWidth;
      const cellY = ty + 0.5;
      const rowStartX = Math.max(startX, ty + minDiff, minSum - ty);
      const rowEndX = Math.min(endX, ty + maxDiff, maxSum - ty);
      for (let tx = rowStartX; tx <= rowEndX; tx++) {
        const type = map.get(tx, ty);
        if (type === TileType.Empty) continue;

        const cellX = tx + 0.5;
        const posX = Math.round((cellX - cellY) * 32 + halfW);
        const posY = Math.round((cellX + cellY) * 16 + halfH);

        if (type === TileType.Wall) {
          if (isTown) {
            // Draw meadow turf underneath trees & perimeter walls so there are no dark holes under trees
            const isTree = tileFlags
              ? (tileFlags[rowOffset + tx] & TOWN_TILE_FLAG_TREE) !== 0
              : tx === 0 ||
                ty === 0 ||
                tx === map.width - 1 ||
                ty === map.height - 1 ||
                townData?.treeSet?.has(`${tx},${ty}`);
            if (isTree) {
              this.drawTile(
                ctx,
                posX,
                posY,
                TileType.Floor,
                tx,
                ty,
                gameTime,
                theme,
                isTown,
                atlas,
                townData,
                map
              );
            }
          } else if (!this.isPerimeterWall(map, tx, ty)) {
            this.drawVoidBedrockTile(ctx, posX, posY, tx, ty, theme, atlas);
          }
          continue;
        }

        this.drawTile(
          ctx,
          posX,
          posY,
          type,
          tx,
          ty,
          gameTime,
          theme,
          isTown,
          atlas,
          townData,
          map
        );

        // Queue directional wall ambient occlusion shadows to flush after the batched floor atlas pass
        const wallNorth = map.get(tx, ty - 1) === TileType.Wall;
        const wallWest = map.get(tx - 1, ty) === TileType.Wall;
        if ((wallNorth || wallWest) && shadowCount < 2048) {
          this.shadowQueueX[shadowCount] = posX;
          this.shadowQueueY[shadowCount] = posY;
          this.shadowQueueKind[shadowCount] = wallNorth && wallWest ? 3 : wallNorth ? 1 : 2;
          shadowCount++;
        }

        if (type === TileType.Lava) {
          dynamicLights.push({
            x: posX,
            y: posY,
            radius: 95,
            color: '#f97316',
            intensity: 0.45,
          });
        } else if (type === TileType.Exit) {
          dynamicLights.push({
            x: posX,
            y: posY - 16,
            radius: 170,
            color: '#c084fc',
            intensity: 0.85,
          });
        } else if (type === TileType.Chest) {
          dynamicLights.push({
            x: posX,
            y: posY - 8,
            radius: 110,
            color: '#fbbf24',
            intensity: 0.55,
          });
        }
      }
    }

    // Flush all queued floor, grass, road, interior, water, shoreline, and void sprites from the single Master Texture Sheet!
    if (atlas) {
      this.spriteBatcher.flush(ctx, atlas.masterSheet);
    }

    // Flush queued wall-to-floor ambient occlusion shadows in a single uninterrupted pass
    for (let i = 0; i < shadowCount; i++) {
      const kind = this.shadowQueueKind[i];
      this.drawFloorWallShadow(
        ctx,
        this.shadowQueueX[i],
        this.shadowQueueY[i],
        (kind & 1) !== 0,
        (kind & 2) !== 0
      );
    }

    // 1.2 Render Ground-Layer Combat Decals (Frost Nova ice patterns, Scorch craters, Shockwave rings)
    for (const p of particles) {
      if (p.kind === 'frost_nova' || p.kind === 'scorch' || p.kind === 'shockwave' || p.kind === 'ring') {
        const pos = this.worldToScreen(p.x, p.y, 0, camera);
        this.drawGroundDecalParticle(ctx, pos.x, pos.y, p, gameTime);
        if (p.kind === 'frost_nova' || p.kind === 'scorch') {
          dynamicLights.push({
            x: pos.x,
            y: pos.y,
            radius: p.size * 1.4,
            color: p.color,
            intensity: Math.max(0, (p.life / p.maxLife) * 0.8),
          });
        }
      }
    }

    // 1.5 Render Ground Warning Telegraphs (Boss & Elite AoE circles/rings)
    for (const tele of telegraphs) {
      const pos = this.worldToScreen(tele.x, tele.y, 0, camera);
      const ratio = Math.max(0, Math.min(1, 1 - tele.duration / tele.maxDuration));
      const rx = tele.radius * (this.isoTileW / 64);
      const ry = tele.radius * (this.isoTileH / 64);

      ctx.save();
      const isFrost = tele.school === 2;
      const isArcane = tele.school === 3 || tele.school === 4;
      const baseStroke = isFrost ? '#38bdf8' : isArcane ? '#c084fc' : '#ef4444';
      const baseFill = isFrost
        ? 'rgba(56, 189, 248, 0.18)'
        : isArcane
        ? 'rgba(192, 132, 252, 0.18)'
        : 'rgba(239, 68, 68, 0.18)';
      const innerFill = isFrost
        ? 'rgba(56, 189, 248, 0.44)'
        : isArcane
        ? 'rgba(192, 132, 252, 0.44)'
        : 'rgba(239, 68, 68, 0.44)';

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = baseFill;
      ctx.fill();
      ctx.strokeStyle = baseStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx * ratio, ry * ratio, 0, 0, Math.PI * 2);
      ctx.fillStyle = innerFill;
      ctx.fill();

      // Runic crosshairs inside telegraph
      ctx.strokeStyle = baseStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x - rx * 0.6, pos.y);
      ctx.lineTo(pos.x + rx * 0.6, pos.y);
      ctx.moveTo(pos.x, pos.y - ry * 0.6);
      ctx.lineTo(pos.x, pos.y + ry * 0.6);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EVADE', pos.x, pos.y + 3);
      ctx.restore();
    }

    // Compute visible spatial partitioning chunks (8x8-tile grid) when in Town overworld
    const spatialIndex = isTown ? townData?.spatialIndex : undefined;
    const chunkStartX = spatialIndex ? Math.max(0, startX >> 3) : 0;
    const chunkEndX = spatialIndex ? Math.min(spatialIndex.cols - 1, endX >> 3) : -1;
    const chunkStartY = spatialIndex ? Math.max(0, startY >> 3) : 0;
    const chunkEndY = spatialIndex ? Math.min(spatialIndex.rows - 1, endY >> 3) : -1;

    // 1.1 Render Flat Interior Rugs on Floor Layer (Spatially culled by chunk + Roof-occlusion culled!)
    if (spatialIndex && townData) {
      for (let cy = chunkStartY; cy <= chunkEndY; cy++) {
        const rowBase = cy * spatialIndex.cols;
        for (let cx = chunkStartX; cx <= chunkEndX; cx++) {
          const chunk = spatialIndex.chunks[rowBase + cx];
          for (let i = 0; i < chunk.rugs.length; i++) {
            const tagged = chunk.rugs[i];
            if (tagged.buildingIdx >= 0) {
              const b = townData.buildings[tagged.buildingIdx];
              if (b && (this.buildingRoofAlpha.get(b.id) ?? 1.0) >= 0.98) {
                // Cull indoor rug completely when building roof is opaque!
                continue;
              }
            }
            const prop = tagged.prop;
            const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
            if (pos.x >= -150 && pos.x <= this.width + 150 && pos.y >= -150 && pos.y <= this.height + 150) {
              this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme, daylight.isNightLightsOn);
            }
          }
        }
      }
    } else {
      for (const prop of props) {
        if (prop.kind === 'rug') {
          const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
          if (pos.x >= -150 && pos.x <= this.width + 150 && pos.y >= -150 && pos.y <= this.height + 150) {
            this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme, daylight.isNightLightsOn);
          }
        }
      }
    }

    // 2. Collect all depth-sorted renderables: Perimeter 3D Walls, Props, Enemies, Player, Loot, Chests
    interface DepthItem {
      depth: number;
      draw: () => void;
    }
    const depthList: DepthItem[] = [];

    const playerTile = map.worldToTile(player.x, player.y);

    // Perimeter 3D Walls, Trees, Chests, and Exit Portals
    if (spatialIndex && tileFlags && wallBuildingIdx && townData) {
      // Fast Spatial Chunk Wall & Tree Culling for Overworld Navigation
      for (let cy = chunkStartY; cy <= chunkEndY; cy++) {
        const rowBase = cy * spatialIndex.cols;
        for (let cx = chunkStartX; cx <= chunkEndX; cx++) {
          const wallList = spatialIndex.chunks[rowBase + cx].perimeterWalls;
          for (let i = 0; i < wallList.length; i++) {
            const packed = wallList[i];
            const ty = packed >>> 16;
            const tx = packed & 0xffff;
            const cellX = tx + 0.5;
            const cellY = ty + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -150 || posX > this.width + 150 || posY < -130 || posY > this.height + 170) {
              continue;
            }

            const tileIdx = ty * mapWidth + tx;
            const flags = tileFlags[tileIdx];
            const isOuterTree = (flags & TOWN_TILE_FLAG_TREE) !== 0;

            let wallAlpha = 1.0;
            if (
              tx >= playerTile.x &&
              ty >= playerTile.y &&
              tx - playerTile.x <= 2 &&
              ty - playerTile.y <= 2 &&
              tx + ty > playerTile.x + playerTile.y
            ) {
              wallAlpha = 0.35;
            }

            if (!isOuterTree) {
              const bIdx = wallBuildingIdx[tileIdx];
              if (bIdx >= 0) {
                if (bIdx === activeBuildingIndex) {
                  wallAlpha = (flags & TOWN_TILE_FLAG_FRONT_WALL) !== 0 ? 0.18 : 0.72;
                }
                if (daylight.isNightLightsOn && (flags & TOWN_TILE_FLAG_WINDOW) !== 0) {
                  const lanternFactor = daylight.lanternIntensity ?? 1.0;
                  dynamicLights.push({
                    x: posX,
                    y: posY - 22,
                    radius: 145,
                    color: '#fbbf24',
                    intensity: 0.72 * lanternFactor,
                  });
                }
              }
            }

            depthList.push({
              depth: (cellX + cellY) * 64,
              draw: () =>
                this.drawWallBlock(
                  ctx,
                  posX,
                  posY,
                  tx,
                  ty,
                  theme,
                  isTown,
                  atlas,
                  wallAlpha,
                  isOuterTree,
                  gameTime
                ),
            });
          }
        }
      }

      // Town Dungeon Gate Portal
      if (townData.dungeonPortalPos) {
        const portalPos = this.worldToScreen(townData.dungeonPortalPos.x, townData.dungeonPortalPos.y, 0, camera);
        if (
          portalPos.x >= -160 &&
          portalPos.x <= this.width + 160 &&
          portalPos.y >= -160 &&
          portalPos.y <= this.height + 160
        ) {
          depthList.push({
            depth: townData.dungeonPortalPos.x + townData.dungeonPortalPos.y,
            draw: () => this.drawExitPortal(ctx, portalPos.x, portalPos.y, gameTime, true),
          });
        }
      }
    } else {
      const wMinDiff = Math.floor((-150 - halfW) / 32) - 1;
      const wMaxDiff = Math.ceil((this.width + 150 - halfW) / 32) + 1;
      const wMinSum = Math.floor((-130 - halfH) / 16) - 2;
      const wMaxSum = Math.ceil((this.height + 170 - halfH) / 16) + 1;

      for (let ty = startY; ty <= endY; ty++) {
        const rowOffset = ty * mapWidth;
        const cellY = ty + 0.5;
        const rowStartX = Math.max(startX, ty + wMinDiff, wMinSum - ty);
        const rowEndX = Math.min(endX, ty + wMaxDiff, wMaxSum - ty);
        for (let tx = rowStartX; tx <= rowEndX; tx++) {
          const type = map.get(tx, ty);
          if (type === TileType.Wall) {
            const cellX = tx + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -150 || posX > this.width + 150 || posY < -130 || posY > this.height + 170) {
              continue;
            }

            const tileIdx = rowOffset + tx;
            const flags = tileFlags ? tileFlags[tileIdx] : 0;
            const isPerim =
              isTown && tileFlags
                ? (flags & TOWN_TILE_FLAG_PERIMETER_WALL) !== 0
                : this.isPerimeterWall(map, tx, ty);
            if (!isPerim) continue;

            const isOuterTree =
              isTown &&
              (tileFlags
                ? (flags & TOWN_TILE_FLAG_TREE) !== 0
                : tx === 0 ||
                  ty === 0 ||
                  tx === map.width - 1 ||
                  ty === map.height - 1 ||
                  (townData?.treeSet ? townData.treeSet.has(`${tx},${ty}`) : false));

            let wallAlpha = 1.0;
            const occludesPlayer =
              tx >= playerTile.x &&
              ty >= playerTile.y &&
              tx - playerTile.x <= 2 &&
              ty - playerTile.y <= 2 &&
              tx + ty > playerTile.x + playerTile.y;

            if (occludesPlayer) {
              wallAlpha = 0.35;
            }

            if (isTown && !isOuterTree) {
              if (wallBuildingIdx && tileFlags) {
                const bIdx = wallBuildingIdx[tileIdx];
                if (bIdx >= 0) {
                  if (bIdx === activeBuildingIndex) {
                    wallAlpha = (flags & TOWN_TILE_FLAG_FRONT_WALL) !== 0 ? 0.18 : 0.72;
                  }
                  if (daylight.isNightLightsOn && (flags & TOWN_TILE_FLAG_WINDOW) !== 0) {
                    const lanternFactor = daylight.lanternIntensity ?? 1.0;
                    dynamicLights.push({
                      x: posX,
                      y: posY - 22,
                      radius: 145,
                      color: '#fbbf24',
                      intensity: 0.72 * lanternFactor,
                    });
                  }
                }
              }
            }

            depthList.push({
              depth: (cellX + cellY) * 64,
              draw: () =>
                this.drawWallBlock(
                  ctx,
                  posX,
                  posY,
                  tx,
                  ty,
                  theme,
                  isTown,
                  atlas,
                  wallAlpha,
                  isOuterTree,
                  gameTime
                ),
            });
          } else if (type === TileType.Chest) {
            const cellX = tx + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -140 || posX > this.width + 140 || posY < -140 || posY > this.height + 140) {
              continue;
            }
            depthList.push({
              depth: (cellX + cellY) * 64,
              draw: () => this.drawChest(ctx, posX, posY, gameTime),
            });
          } else if (type === TileType.Exit) {
            const cellX = tx + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -160 || posX > this.width + 160 || posY < -160 || posY > this.height + 160) {
              continue;
            }
            depthList.push({
              depth: (cellX + cellY) * 64,
              draw: () => this.drawExitPortal(ctx, posX, posY, gameTime, isTown),
            });
          }
        }
      }
    }

    // Handcrafted Environmental & Interior Props (Spatially partitioned by chunk + Interior roof-occlusion culled!)
    const lanternFactor = daylight.lanternIntensity ?? (daylight.isNightLightsOn ? 1.0 : 0.0);
    if (spatialIndex && townData) {
      for (let cy = chunkStartY; cy <= chunkEndY; cy++) {
        const rowBase = cy * spatialIndex.cols;
        for (let cx = chunkStartX; cx <= chunkEndX; cx++) {
          const chunkProps = spatialIndex.chunks[rowBase + cx].props;
          for (let i = 0; i < chunkProps.length; i++) {
            const tagged = chunkProps[i];
            if (tagged.buildingIdx >= 0) {
              const b = townData.buildings[tagged.buildingIdx];
              if (b && (this.buildingRoofAlpha.get(b.id) ?? 1.0) >= 0.98) {
                // Skip indoor furniture & indoor lights when the building's roof is opaque!
                continue;
              }
            }
            const prop = tagged.prop;
            const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
            if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
              continue;
            }
            if (prop.lightColor && prop.lightRadius) {
              const isStreetLamp = prop.kind === 'street_lantern';
              const activeLight = !isStreetLamp || daylight.isNightLightsOn;
              if (activeLight) {
                dynamicLights.push({
                  x: pos.x,
                  y: pos.y - 16,
                  radius: isStreetLamp ? prop.lightRadius * (0.85 + 0.3 * lanternFactor) : prop.lightRadius,
                  color: prop.lightColor,
                  intensity: isStreetLamp ? 0.92 * lanternFactor : 0.8,
                });
              }
            }
            depthList.push({
              depth: prop.x + prop.y,
              draw: () => this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme, daylight.isNightLightsOn),
            });
          }
        }
      }
    } else {
      for (const prop of props) {
        if (prop.kind === 'rug') continue; // Already drawn on floor pass
        const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
        if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
          continue;
        }
        if (prop.lightColor && prop.lightRadius) {
          const isStreetLamp = prop.kind === 'street_lantern';
          const activeLight = !isStreetLamp || daylight.isNightLightsOn;
          if (activeLight) {
            dynamicLights.push({
              x: pos.x,
              y: pos.y - 16,
              radius: isStreetLamp ? prop.lightRadius * (0.85 + 0.3 * lanternFactor) : prop.lightRadius,
              color: prop.lightColor,
              intensity: isStreetLamp ? 0.92 * lanternFactor : 0.8,
            });
          }
        }
        depthList.push({
          depth: prop.x + prop.y,
          draw: () => this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme, daylight.isNightLightsOn),
        });
      }
    }

    // Loot Drops with Rarity Light Pillars
    for (const drop of lootDrops) {
      const pos = this.worldToScreen(drop.x, drop.y, 0, camera);
      const def = getItemDef(drop.item.itemDefId);
      if (def && (def.rarity ?? 0) >= ItemRarity.Rare) {
        dynamicLights.push({
          x: pos.x,
          y: pos.y - 10,
          radius: 90,
          color: def.rarity === ItemRarity.Legendary ? '#f97316' : def.rarity === ItemRarity.Epic ? '#c084fc' : '#38bdf8',
          intensity: 0.65,
        });
      }
      depthList.push({
        depth: drop.x + drop.y,
        draw: () => this.drawLootDrop(ctx, pos.x, pos.y, drop, gameTime),
      });
    }

    // Dash Afterimages (Depth-sorted with characters)
    for (const p of particles) {
      if (p.kind === 'afterimage') {
        const pos = this.worldToScreen(p.x, p.y, 0, camera);
        const alpha = Math.max(0, (p.life / p.maxLife) * 0.55);
        depthList.push({
          depth: p.x + p.y - 2,
          draw: () =>
            drawHeroRig(
              ctx,
              pos.x,
              pos.y,
              {
                ...player,
                x: p.x,
                y: p.y,
                facingAngle: p.angle ?? player.facingAngle,
                isAttacking: false,
                playerClass: p.playerClass || player.playerClass,
              },
              gameTime,
              { isGhost: true, ghostColor: p.color, ghostAlpha: alpha }
            ),
        });
      }
    }

    // Enemies
    for (const enemy of enemies) {
      const pos = this.worldToScreen(enemy.x, enemy.y, enemy.z, camera);
      if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
        continue;
      }
      if (enemy.archetype === 'dungeon_lord' || enemy.isElite) {
        dynamicLights.push({
          x: pos.x,
          y: pos.y - 18,
          radius: enemy.archetype === 'dungeon_lord' ? 165 : 105,
          color: enemy.archetype === 'dungeon_lord' ? '#ef4444' : '#f59e0b',
          intensity: 0.55,
        });
      }
      depthList.push({
        depth: enemy.x + enemy.y,
        draw: () => drawEnemyRig(ctx, pos.x, pos.y, enemy, gameTime),
      });
    }

    // Town NPCs (with walking animation & handheld night lanterns)
    for (const npc of npcs) {
      const pos = this.worldToScreen(npc.x, npc.y, 0, camera);
      if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
        continue;
      }
      const isNear = activeNPC !== null && activeNPC.id === npc.id;
      if (isTown && daylight.isNightLightsOn && npc.carriesLantern !== false) {
        dynamicLights.push({
          x: pos.x,
          y: pos.y - 18,
          radius: 165,
          color: '#fbbf24',
          intensity: 0.85 * lanternFactor,
        });
      }
      depthList.push({
        depth: npc.x + npc.y,
        draw: () => drawNPCRig(ctx, pos.x, pos.y, npc, isNear, gameTime, isTown && daylight.isNightLightsOn),
      });
    }

    // Necromancer Summons
    for (const summon of summons) {
      const pos = this.worldToScreen(summon.x, summon.y, 0, camera);
      depthList.push({
        depth: summon.x + summon.y,
        draw: () => drawSummonRig(ctx, pos.x, pos.y, summon, gameTime),
      });
    }

    // Town Central Fountain
    if (fountainPos) {
      const pos = this.worldToScreen(fountainPos.x, fountainPos.y, 0, camera);
      dynamicLights.push({
        x: pos.x,
        y: pos.y - 16,
        radius: 230,
        color: '#38bdf8',
        intensity: 0.88,
      });
      depthList.push({
        depth: fountainPos.x + fountainPos.y,
        draw: () => this.drawFountain(ctx, pos.x, pos.y, gameTime, atlas),
      });
    }

    // Hero (Player)
    const playerPos = this.worldToScreen(player.x, player.y, 0, camera);
    depthList.push({
      depth: player.x + player.y,
      draw: () => drawHeroRig(ctx, playerPos.x, playerPos.y, player, gameTime),
    });

    // Execute Painter's Algorithm Depth Sort with Master Texture Sheet Sprite Batching
    depthList.sort((a, b) => a.depth - b.depth);
    this.spriteBatcher.clear();
    for (let i = 0; i < depthList.length; i++) {
      depthList[i].draw();
    }
    if (atlas) {
      this.spriteBatcher.flush(ctx, atlas.masterSheet);
    }

    // 2.5 Render Medieval Pitched Roofs, Gable Dormers, Turrets & Chimneys (Spatially culled by visible chunks)
    if (isTown && townData?.buildings) {
      if (spatialIndex) {
        let seenBuildingMask = 0;
        for (let cy = chunkStartY; cy <= chunkEndY; cy++) {
          const rowBase = cy * spatialIndex.cols;
          for (let cx = chunkStartX; cx <= chunkEndX; cx++) {
            const bIndices = spatialIndex.chunks[rowBase + cx].buildingIndices;
            for (let i = 0; i < bIndices.length; i++) {
              const bIdx = bIndices[i];
              const bit = 1 << bIdx;
              if ((seenBuildingMask & bit) !== 0) continue;
              seenBuildingMask |= bit;
              const b = townData.buildings[bIdx];
              const roofAlpha = this.buildingRoofAlpha.get(b.id) ?? 1.0;
              this.drawTownBuildingRoof(ctx, map, camera, b, roofAlpha, gameTime, daylight.isNightLightsOn);
            }
          }
        }
      } else {
        for (const b of townData.buildings) {
          const roofAlpha = this.buildingRoofAlpha.get(b.id) ?? 1.0;
          this.drawTownBuildingRoof(ctx, map, camera, b, roofAlpha, gameTime, daylight.isNightLightsOn);
        }
      }
    }

    // 3. Projectiles (rendered above ground with dynamic spell light)
    for (const proj of projectiles) {
      const pos = this.worldToScreen(proj.x, proj.y, 16, camera);
      this.drawProjectile(ctx, pos.x, pos.y, proj, gameTime);
      dynamicLights.push({
        x: pos.x,
        y: pos.y,
        radius: proj.school === 1 ? 135 : 95,
        color: proj.color,
        intensity: 0.75,
      });
    }

    // 4. Elevated Combat & Spell Particles (Slash arcs, Ice shards, Embers, Sparks, Blood, Bone fragments)
    if (this.quality !== 'low') {
      for (const p of particles) {
        if (
          p.kind === 'frost_nova' ||
          p.kind === 'scorch' ||
          p.kind === 'shockwave' ||
          p.kind === 'ring' ||
          p.kind === 'afterimage'
        ) {
          continue; // Already rendered in ground or depth pass
        }
        const pos = this.worldToScreen(p.x, p.y, p.z ?? 10, camera);
        this.drawElevatedParticle(ctx, pos.x, pos.y, p);
      }
    }

    // 5. Offscreen Lightmap Compositing & Daylight / Night Torch Illumination
    if (this.quality !== 'low') {
      this.drawDynamicLighting(
        ctx,
        playerPos.x,
        playerPos.y,
        player.isAttacking,
        dynamicLights,
        theme,
        isTown,
        gameTime,
        daylight
      );
      this.drawAtmosphericMotes(ctx, camera, theme, isTown, gameTime);
    }

    // 6. Floating Combat Numbers
    for (const fct of floatingTexts) {
      const pos = this.worldToScreen(fct.x, fct.y, 28, camera);
      const progress = 1 - fct.lifetime / fct.maxLifetime;
      const offsetY = progress * 36;
      const alpha = Math.max(0, fct.lifetime / fct.maxLifetime);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = fct.isCrit
        ? 'bold 20px "Cinzel", serif'
        : 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeText(fct.text, pos.x, pos.y - offsetY);
      ctx.fillStyle = fct.color;
      ctx.fillText(fct.text, pos.x, pos.y - offsetY);
      ctx.restore();
    }
  }

  private queueOrBlitAtlasSprite(
    ctx: CanvasRenderingContext2D,
    atlas: ReturnType<TileAtlasBank['getAtlas']>,
    sprite: HTMLCanvasElement,
    dx: number,
    dy: number,
    alpha = 1.0,
    useBatcher = true
  ) {
    if (atlas) {
      const rect = atlas.rectMap.get(sprite);
      if (rect) {
        if (useBatcher) {
          this.spriteBatcher.queue(rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, alpha);
          return;
        }
        if (alpha < 0.99) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            atlas.masterSheet,
            rect.sx,
            rect.sy,
            rect.sw,
            rect.sh,
            dx,
            dy,
            rect.sw,
            rect.sh
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            atlas.masterSheet,
            rect.sx,
            rect.sy,
            rect.sw,
            rect.sh,
            dx,
            dy,
            rect.sw,
            rect.sh
          );
        }
        return;
      }
    }
    if (alpha < 0.99) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, dx, dy);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, dx, dy);
    }
  }

  private drawVoidBedrockTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tx: number,
    ty: number,
    theme: DungeonThemeConfig,
    atlas?: ReturnType<TileAtlasBank['getAtlas']>
  ) {
    const h = spatialHash(tx, ty, 77);
    if (atlas && atlas.voidBedrockSprites.length > 0) {
      const sprite = atlas.voidBedrockSprites[h & 3];
      this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
      return;
    }

    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = (h & 1) === 0 ? '#060911' : '#080c16';
    ctx.fill();

    if (h % 5 === 0) {
      ctx.strokeStyle = theme.wallLeft;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 8, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFloorWallShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    wallNorth: boolean,
    wallWest: boolean
  ) {
    // Fast pre-baked offscreen shadow sprite draw (eliminates per-tile ctx.clip & createLinearGradient!)
    const sprite =
      wallNorth && wallWest
        ? this.wallShadowBoth
        : wallNorth
        ? this.wallShadowNorth
        : this.wallShadowWest;
    if (sprite) {
      ctx.drawImage(sprite, x - 36, y - 20);
      return;
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: TileType,
    tx: number,
    ty: number,
    gameTime: number,
    theme: DungeonThemeConfig,
    isTown: boolean,
    atlas: ReturnType<TileAtlasBank['getAtlas']>,
    townData?: GeneratedTown,
    map?: TileMap
  ) {
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;

    if (type === TileType.Floor || type === TileType.Chest || type === TileType.Exit) {
      const h = spatialHash(tx, ty, 19);
      if (atlas) {
        if (isTown) {
          const flags =
            townData?.tileFlags && map ? townData.tileFlags[ty * map.width + tx] : 0;
          if (townData?.tileFlags) {
            if (
              flags &
              (TOWN_TILE_FLAG_INTERIOR_OAK |
                TOWN_TILE_FLAG_INTERIOR_STONE |
                TOWN_TILE_FLAG_INTERIOR_CARPET)
            ) {
              const sprites =
                (flags & TOWN_TILE_FLAG_INTERIOR_OAK) !== 0
                  ? atlas.townInteriorWoodSprites
                  : (flags & TOWN_TILE_FLAG_INTERIOR_CARPET) !== 0
                  ? atlas.townInteriorCarpetSprites
                  : atlas.townInteriorStoneSprites;
              const sprite = sprites[h % sprites.length];
              this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
              return;
            }
            const isRoad = (flags & TOWN_TILE_FLAG_ROAD) !== 0;
            if (isRoad) {
              const sprite = atlas.townRoadSprites[h % atlas.townRoadSprites.length];
              this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
            } else if (atlas.townGrassFrames.length > 0) {
              // Subtle traveling wind-sway wave across the vibrant emerald meadow grass
              const grassFrame = (((Math.floor(gameTime * 4.5 + tx * 0.35 + ty * 0.2)) % 6) + 6) % 6;
              const sprite = atlas.townGrassFrames[grassFrame][h & 7];
              this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
            } else {
              const sprite = atlas.townGrassSprites[h % atlas.townGrassSprites.length];
              this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
            }
            return;
          }

          const key = `${tx},${ty}`;
          const interiorStyle = townData?.interiorTiles?.get(key);
          if (interiorStyle) {
            const sprites =
              interiorStyle === 'oak_planks'
                ? atlas.townInteriorWoodSprites
                : interiorStyle === 'royal_carpet'
                ? atlas.townInteriorCarpetSprites
                : atlas.townInteriorStoneSprites;
            const sprite = sprites[h % sprites.length];
            this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
            return;
          }

          const isRoad = townData?.roadTiles
            ? townData.roadTiles.has(key)
            : tx === 48 ||
              ty === 46 ||
              (tx >= 44 && tx <= 52 && ty >= 42 && ty <= 50);
          if (isRoad) {
            const sprite = atlas.townRoadSprites[h % atlas.townRoadSprites.length];
            this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
          } else if (atlas.townGrassFrames.length > 0) {
            const grassFrame = (((Math.floor(gameTime * 4.5 + tx * 0.35 + ty * 0.2)) % 6) + 6) % 6;
            const sprite = atlas.townGrassFrames[grassFrame][h & 7];
            this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
          } else {
            const sprite = atlas.townGrassSprites[h % atlas.townGrassSprites.length];
            this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
          }
          return;
        } else {
          // Bias variant distribution so runes (15) and bloodstains (11,12) are rare landmarks
          const roll = h % 32;
          const variantIdx =
            roll < 28 ? roll % 11 : roll === 28 ? 11 : roll === 29 ? 12 : roll === 30 ? 13 : 15;
          const sprite = atlas.floorSprites[variantIdx];
          this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);
          return;
        }
      }

      // Direct fallback for headless test environments without offscreen canvas
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x + hw, y);
      ctx.lineTo(x, y + hh);
      ctx.lineTo(x - hw, y);
      ctx.closePath();
      ctx.fillStyle = (tx + ty) % 2 === 0 ? theme.floorPrimary : theme.floorSecondary;
      ctx.fill();
      ctx.strokeStyle = theme.floorBorder;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === TileType.Water) {
      // Determine which neighboring tiles are also Water so adjacent tiles fuse seamlessly
      const nWater = map ? map.get(tx, ty - 1) === TileType.Water : false;
      const sWater = map ? map.get(tx, ty + 1) === TileType.Water : false;
      const wWater = map ? map.get(tx - 1, ty) === TileType.Water : false;
      const eWater = map ? map.get(tx + 1, ty) === TileType.Water : false;
      const shoreMask =
        (nWater ? 0 : 1) | (eWater ? 0 : 2) | (sWater ? 0 : 4) | (wWater ? 0 : 8);
      const isDeep = shoreMask === 0;
      const h = spatialHash(tx, ty, 701);

      if (atlas && atlas.townWaterShallowFrames.length > 0) {
        // Fast O(1) pre-baked 8-frame water flowing animation queued to SpriteBatcher
        const frameIdx = (Math.floor(gameTime * 7.5) + ((tx + ty) & 1)) & 7;
        const frames = isDeep ? atlas.townWaterDeepFrames[frameIdx] : atlas.townWaterShallowFrames[frameIdx];
        const sprite = frames[h & 3];
        this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);

        // Queue pre-baked shoreline foam & stone embankment overlay from the Master Texture Sheet!
        if (shoreMask !== 0 && atlas.shorelineSprites[shoreMask]) {
          this.queueOrBlitAtlasSprite(
            ctx,
            atlas,
            atlas.shorelineSprites[shoreMask],
            x - 36,
            y - 20,
            1.0,
            true
          );
        }
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.lineTo(x, y + hh);
        ctx.lineTo(x - hw, y);
        ctx.closePath();
        ctx.fillStyle = isDeep ? '#116985' : '#18829e';
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    // Flush any pending atlas sprites before immediate vector hazard tile drawing
    if (atlas) {
      this.spriteBatcher.flush(ctx, atlas.masterSheet);
    }

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();

    if (type === TileType.Lava) {
      const lavaGrad = ctx.createRadialGradient(x, y, 2, x, y, 28);
      lavaGrad.addColorStop(0, '#fef08a');
      lavaGrad.addColorStop(0.45, '#f97316');
      lavaGrad.addColorStop(0.85, '#be123c');
      lavaGrad.addColorStop(1, '#450a0a');
      ctx.fillStyle = lavaGrad;
      ctx.fill();

      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dark cooling basalt crust plates floating on magma
      ctx.fillStyle = 'rgba(24, 10, 10, 0.72)';
      ctx.beginPath();
      ctx.ellipse(x - 8, y + 2, 6, 3, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 9, y - 3, 5, 2.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === TileType.Pit) {
      // Multi-tiered Abyssal Chasm with stone rim bevel
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y - hh * 0.82);
      ctx.lineTo(x + hw * 0.82, y);
      ctx.lineTo(x, y + hh * 0.82);
      ctx.lineTo(x - hw * 0.82, y);
      ctx.closePath();
      ctx.fillStyle = '#020617';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y - hh * 0.58);
      ctx.lineTo(x + hw * 0.58, y);
      ctx.lineTo(x, y + hh * 0.58);
      ctx.lineTo(x - hw * 0.58, y);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    ctx.restore();
  }

  private drawWallBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tx: number,
    ty: number,
    theme: DungeonThemeConfig,
    isTown: boolean,
    atlas: ReturnType<TileAtlasBank['getAtlas']>,
    alpha = 1.0,
    isOuterTree = false,
    gameTime = 0
  ) {
    // Town perimeter or grove trees
    if (isTown && isOuterTree) {
      this.drawTownSanctuaryTree(ctx, x, y, tx, ty, gameTime, alpha, atlas);
      return;
    }

    if (atlas) {
      const h = spatialHash(tx, ty, 43);
      const sprites = isTown ? atlas.townWallSprites : atlas.wallSprites;
      const sprite = sprites[h % sprites.length];
      this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 74, alpha, false);
      return;
    }

    // Fallback direct vector wall block for headless tests
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;
    const wallHeight = 52;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.wallLeft;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - wallHeight);
    ctx.lineTo(x - hw, y - wallHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.wallRight;
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y - wallHeight);
    ctx.lineTo(x, y + hh - wallHeight);
    ctx.closePath();
    ctx.fill();

    const topY = y - wallHeight;
    ctx.fillStyle = theme.wallTop;
    ctx.beginPath();
    ctx.moveTo(x, topY - hh);
    ctx.lineTo(x + hw, topY);
    ctx.lineTo(x, topY + hh);
    ctx.lineTo(x - hw, topY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawTownBuildingRoof(
    ctx: CanvasRenderingContext2D,
    map: TileMap,
    camera: Camera,
    b: TownBuilding,
    roofAlpha: number,
    gameTime: number,
    isNight: boolean
  ) {
    // Always draw building nameplate banner on front doorway even when inside
    const primaryDoor = b.doors[0] || { x: Math.floor(b.x + b.w / 2), y: b.y + b.h - 1 };
    const doorWorld = map.tileToWorldCenter(primaryDoor.x, primaryDoor.y);
    const doorScreen = this.worldToScreen(doorWorld.x, doorWorld.y, 62, camera);

    if (
      doorScreen.x < -350 ||
      doorScreen.x > this.width + 350 ||
      doorScreen.y < -350 ||
      doorScreen.y > this.height + 350
    ) {
      return;
    }

    // Palette by roofStyle (inspired by the medieval reference sheets)
    const palette =
      b.roofStyle === 'teal_slate_manor'
        ? {
            litSlope: '#1d7a74',
            shadedSlope: '#11514d',
            ridge: '#5eead4',
            gablePlaster: '#e7dcc8',
            timber: '#3e2412',
            shingleLine: 'rgba(13, 48, 45, 0.55)',
          }
        : b.roofStyle === 'weathered_stone_inn'
        ? {
            litSlope: '#64748b',
            shadedSlope: '#334155',
            ridge: '#94a3b8',
            gablePlaster: '#d6cfc2',
            timber: '#332215',
            shingleLine: 'rgba(15, 23, 42, 0.55)',
          }
        : b.roofStyle === 'stone_keep'
        ? {
            litSlope: '#475569',
            shadedSlope: '#1e293b',
            ridge: '#cbd5e1',
            gablePlaster: '#94a3b8',
            timber: '#1e293b',
            shingleLine: 'rgba(2, 6, 23, 0.6)',
          }
        : b.roofStyle === 'rustic_cottage'
        ? {
            litSlope: '#b47b38',
            shadedSlope: '#784e1d',
            ridge: '#fcd34d',
            gablePlaster: '#e5d5bc',
            timber: '#45220e',
            shingleLine: 'rgba(69, 26, 3, 0.5)',
          }
        : {
            // terracotta_tudor (classic warm red-brown clay shingles & half-timber gables)
            litSlope: '#9a4426',
            shadedSlope: '#692a15',
            ridge: '#fdba74',
            gablePlaster: '#ebe0cc',
            timber: '#3e2412',
            shingleLine: 'rgba(48, 16, 6, 0.55)',
          };

    const drawPitchedSection = (rx: number, ry: number, rw: number, rh: number, isWing = false) => {
      const wallBaseZ = 54;
      const peakHeight = isWing ? 36 : Math.min(62, Math.max(42, Math.min(rw, rh) * 7.5));

      // 4 eaves corners in world space (slightly overhanging by 0.22 tiles for authentic medieval eaves)
      const overhang = 0.22 * 64;
      const nwW = { x: rx * 64 - overhang, y: ry * 64 - overhang };
      const neW = { x: (rx + rw) * 64 + overhang, y: ry * 64 - overhang };
      const seW = { x: (rx + rw) * 64 + overhang, y: (ry + rh) * 64 + overhang };
      const swW = { x: rx * 64 - overhang, y: (ry + rh) * 64 + overhang };

      const nw = this.worldToScreen(nwW.x, nwW.y, wallBaseZ, camera);
      const ne = this.worldToScreen(neW.x, neW.y, wallBaseZ, camera);
      const se = this.worldToScreen(seW.x, seW.y, wallBaseZ, camera);
      const sw = this.worldToScreen(swW.x, swW.y, wallBaseZ, camera);

      // Ridge line runs along the longer axis of the building section
      const ridgeAlongX = rw >= rh;
      const rStartW = ridgeAlongX
        ? { x: (rx + 0.4) * 64, y: (ry + rh * 0.5) * 64 }
        : { x: (rx + rw * 0.5) * 64, y: (ry + 0.4) * 64 };
      const rEndW = ridgeAlongX
        ? { x: (rx + rw - 0.4) * 64, y: (ry + rh * 0.5) * 64 }
        : { x: (rx + rw * 0.5) * 64, y: (ry + rh - 0.4) * 64 };

      const rStart = this.worldToScreen(rStartW.x, rStartW.y, wallBaseZ + peakHeight, camera);
      const rEnd = this.worldToScreen(rEndW.x, rEndW.y, wallBaseZ + peakHeight, camera);

      if (ridgeAlongX) {
        // 1. Back North Slope (nw -> ne -> rEnd -> rStart)
        ctx.fillStyle = palette.litSlope;
        ctx.beginPath();
        ctx.moveTo(nw.x, nw.y);
        ctx.lineTo(ne.x, ne.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(rStart.x, rStart.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 2. West Gable Triangle (nw -> rStart -> sw)
        ctx.fillStyle = palette.gablePlaster;
        ctx.beginPath();
        ctx.moveTo(nw.x, nw.y);
        ctx.lineTo(rStart.x, rStart.y);
        ctx.lineTo(sw.x, sw.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 3. Front South Slope (rStart -> rEnd -> se -> sw)
        ctx.fillStyle = palette.shadedSlope;
        ctx.beginPath();
        ctx.moveTo(rStart.x, rStart.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(se.x, se.y);
        ctx.lineTo(sw.x, sw.y);
        ctx.closePath();
        ctx.fill();

        // Shingle course lines on front slope
        ctx.strokeStyle = palette.shingleLine;
        ctx.lineWidth = 1;
        for (let s = 1; s <= 4; s++) {
          const t = s / 5;
          const lx = rStart.x + (sw.x - rStart.x) * t;
          const ly = rStart.y + (sw.y - rStart.y) * t;
          const rxPt = rEnd.x + (se.x - rEnd.x) * t;
          const ryPt = rEnd.y + (se.y - rEnd.y) * t;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(rxPt, ryPt);
          ctx.stroke();
        }
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. East Gable Triangle (ne -> rEnd -> se) with Tudor Timber Bracing & Attic Window
        ctx.fillStyle = palette.gablePlaster;
        ctx.beginPath();
        ctx.moveTo(ne.x, ne.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(se.x, se.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Timber king-post & attic window on East Gable
        const gMidX = (ne.x + se.x) * 0.5;
        const gMidY = (ne.y + se.y) * 0.5;
        ctx.beginPath();
        ctx.moveTo(rEnd.x, rEnd.y);
        ctx.lineTo(gMidX, gMidY);
        ctx.stroke();

        const winX = (rEnd.x + gMidX) * 0.5;
        const winY = (rEnd.y + gMidY) * 0.5;
        ctx.fillStyle = isNight ? '#fbbf24' : '#1e293b';
        ctx.fillRect(winX - 4, winY - 5, 8, 9);
        ctx.strokeRect(winX - 4, winY - 5, 8, 9);

        // 5. Dormer Gable Windows jutting out of the Front South Slope
        if (!isWing && rw >= 7) {
          const dormers = rw >= 9 ? [0.33, 0.67] : [0.5];
          for (const dFrac of dormers) {
            const dx =
              (rStart.x + (rEnd.x - rStart.x) * dFrac + (sw.x + (se.x - sw.x) * dFrac)) * 0.5;
            const dy =
              (rStart.y + (rEnd.y - rStart.y) * dFrac + (sw.y + (se.y - sw.y) * dFrac)) * 0.5;
            ctx.fillStyle = palette.gablePlaster;
            ctx.strokeStyle = palette.timber;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(dx - 9, dy + 6);
            ctx.lineTo(dx, dy - 12);
            ctx.lineTo(dx + 9, dy + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isNight ? '#fef08a' : '#0f172a';
            ctx.fillRect(dx - 3.5, dy - 4, 7, 8);
            ctx.strokeRect(dx - 3.5, dy - 4, 7, 8);
          }
        }
      } else {
        // Ridge runs North-South
        // 1. West Slope (nw -> rStart -> rEnd -> sw)
        ctx.fillStyle = palette.litSlope;
        ctx.beginPath();
        ctx.moveTo(nw.x, nw.y);
        ctx.lineTo(rStart.x, rStart.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(sw.x, sw.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 2. East Slope (ne -> rStart -> rEnd -> se)
        ctx.fillStyle = palette.shadedSlope;
        ctx.beginPath();
        ctx.moveTo(ne.x, ne.y);
        ctx.lineTo(rStart.x, rStart.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(se.x, se.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 3. South Front Gable Triangle (sw -> rEnd -> se)
        ctx.fillStyle = palette.gablePlaster;
        ctx.beginPath();
        ctx.moveTo(sw.x, sw.y);
        ctx.lineTo(rEnd.x, rEnd.y);
        ctx.lineTo(se.x, se.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Highlighted Timber Ridge Crest Beam & Finials
      ctx.strokeStyle = palette.ridge;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(rStart.x, rStart.y);
      ctx.lineTo(rEnd.x, rEnd.y);
      ctx.stroke();

      // Decorative Wrought-Iron Roof Finial Spikes at Ridge Peaks
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rStart.x, rStart.y);
      ctx.lineTo(rStart.x, rStart.y - 10);
      ctx.moveTo(rEnd.x, rEnd.y);
      ctx.lineTo(rEnd.x, rEnd.y - 10);
      ctx.stroke();
    };

    ctx.save();
    if (roofAlpha > 0.05) {
      ctx.globalAlpha = roofAlpha;
      drawPitchedSection(b.x, b.y, b.w, b.h, false);
      if (b.wing) {
        drawPitchedSection(b.wing.x, b.wing.y, b.wing.w, b.wing.h, true);
      }

      // Optional Conical / Octagonal Medieval Spire Turret (like Reference 1 & 2)
      if (b.hasTurret && b.turretTile) {
        const tw = map.tileToWorldCenter(b.turretTile.x + 0.5, b.turretTile.y + 0.5);
        const tBase = this.worldToScreen(tw.x, tw.y, 70, camera);
        const tPeak = this.worldToScreen(tw.x, tw.y, 138, camera);

        // Turret half-timbered upper drum
        ctx.fillStyle = palette.gablePlaster;
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 2;
        ctx.fillRect(tBase.x - 18, tBase.y - 18, 36, 24);
        ctx.strokeRect(tBase.x - 18, tBase.y - 18, 36, 24);

        // Turret arched window
        ctx.fillStyle = isNight ? '#fef08a' : '#0f172a';
        ctx.fillRect(tBase.x - 4, tBase.y - 12, 8, 11);

        // Steep Conical Spire Roof
        ctx.fillStyle = palette.litSlope;
        ctx.beginPath();
        ctx.moveTo(tBase.x - 24, tBase.y - 16);
        ctx.lineTo(tPeak.x, tPeak.y);
        ctx.lineTo(tBase.x + 24, tBase.y - 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Golden Weathervane Finial at Turret Spire Tip
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tPeak.x, tPeak.y);
        ctx.lineTo(tPeak.x, tPeak.y - 14);
        ctx.stroke();
      }

      // Stone Chimney Stack with Rising Warm Hearth Smoke Puffs
      if (b.chimneyTile) {
        const cw = map.tileToWorldCenter(b.chimneyTile.x, b.chimneyTile.y);
        const cPos = this.worldToScreen(cw.x, cw.y, 82, camera);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.4;
        ctx.fillRect(cPos.x - 6, cPos.y - 22, 12, 22);
        ctx.strokeRect(cPos.x - 6, cPos.y - 22, 12, 22);
        ctx.fillStyle = '#334155';
        ctx.fillRect(cPos.x - 8, cPos.y - 25, 16, 4);

        // Rising animated hearth smoke puffs
        for (let s = 0; s < 3; s++) {
          const cycle = (gameTime * 0.8 + s * 0.33 + b.x * 0.1) % 1;
          const sx = cPos.x + Math.sin(gameTime * 2 + s) * 6 + cycle * 8;
          const sy = cPos.y - 28 - cycle * 26;
          const sr = 4 + cycle * 6;
          ctx.fillStyle = `rgba(203, 213, 225, ${(1 - cycle) * 0.38 * roofAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Crisp Building Signboard Plaque Above Doorway (Always readable, gently rises when inside)
    ctx.globalAlpha = 0.94;
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    const labelW = ctx.measureText(b.name).width + 18;
    const signY = roofAlpha < 0.5 ? doorScreen.y + 18 : doorScreen.y - 8;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.1;
    ctx.fillRect(doorScreen.x - labelW / 2, signY - 14, labelW, 17);
    ctx.strokeRect(doorScreen.x - labelW / 2, signY - 14, labelW, 17);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(b.name, doorScreen.x, signY - 2);
    ctx.restore();
  }

  private drawTownSanctuaryTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tx: number,
    ty: number,
    _gameTime: number = 0,
    alpha: number = 1.0,
    atlas?: ReturnType<TileAtlasBank['getAtlas']>
  ) {
    const h = spatialHash(tx, ty, 883);
    // Select species by valley district (0 = Oak, 1 = Pine, 2 = Golden Birch, 3 = Sakura)
    let species = 0;
    if (tx > 55 && ty < 34) {
      species = h % 3 === 0 ? 3 : h % 2 === 0 ? 2 : 0;
    } else if (ty < 25) {
      species = h % 2 === 0 ? 1 : 0;
    } else if (tx > 60 && ty > 55) {
      species = h % 3 === 0 ? 2 : h % 3 === 1 ? 3 : 0;
    } else {
      const roll = h % 10;
      species = roll < 5 ? 0 : roll < 8 ? 1 : roll === 8 ? 2 : 3;
    }

    if (atlas && atlas.townTreeFrames.length >= 6) {
      const variantIdx = species + ((h & 1) === 0 ? 0 : 4);
      // Traveling wind-sway wave across the valley's tree canopies
      const treeFrame = (((Math.floor(_gameTime * 4.2 + tx * 0.45 + ty * 0.3)) % 6) + 6) % 6;
      const sprite = atlas.townTreeFrames[treeFrame][variantIdx];
      this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 48, y - 92, alpha, false);
      return;
    }

    // Lightweight vector fallback for headless tests without offscreen canvas
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 4, y - 24, 8, 26);
    ctx.fillStyle = species === 2 ? '#f59e0b' : species === 3 ? '#f472b6' : '#15803d';
    ctx.beginPath();
    ctx.arc(x, y - 34, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawProp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    prop: DungeonProp,
    gameTime: number,
    theme: DungeonThemeConfig,
    isNight: boolean = false
  ) {
    ctx.save();

    // Ground contact shadow for standing props
    if (
      prop.kind !== 'cobweb' &&
      prop.kind !== 'torch' &&
      prop.kind !== 'banner' &&
      prop.kind !== 'chains' &&
      prop.kind !== 'rug'
    ) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (prop.kind === 'rug') {
      // Ornate Isometric Medieval Woven Carpet with Gold Fringe
      ctx.fillStyle = prop.variant && prop.variant % 2 === 0 ? '#7f1d1d' : '#1e3a8a';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x + 44, y);
      ctx.lineTo(x, y + 22);
      ctx.lineTo(x - 44, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner diamond motif
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x + 26, y);
      ctx.lineTo(x, y + 13);
      ctx.lineTo(x - 26, y);
      ctx.closePath();
      ctx.stroke();
    } else if (prop.kind === 'fireplace') {
      // Heavy Stone Medieval Hearth & Chimney Breast with Blazing Logs
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - 18, y - 38, 36, 38);
      ctx.strokeRect(x - 18, y - 38, 36, 38);

      // Oak Mantelpiece Beam
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 21, y - 24, 42, 5);

      // Arched Firebox Opening
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - 10, 11, Math.PI, 0);
      ctx.lineTo(x + 11, y);
      ctx.lineTo(x - 11, y);
      ctx.closePath();
      ctx.fill();

      // Burning Oak Logs & Flickering Hearth Flames
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 8, y - 5, 16, 4);
      const f1 = Math.sin(gameTime * 9 + x) * 2;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 4);
      ctx.quadraticCurveTo(x - 3 + f1, y - 19, x + f1, y - 21);
      ctx.quadraticCurveTo(x + 5, y - 16, x + 8, y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + f1 * 0.4, y - 9, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'bed') {
      // Cozy Isometric Timber-Framed Medieval Bed with Quilted Blanket & Pillow
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#271206';
      ctx.lineWidth = 1.4;
      // Bed frame & headboard
      ctx.fillRect(x - 16, y - 14, 32, 14);
      ctx.strokeRect(x - 16, y - 14, 32, 14);
      ctx.fillRect(x - 16, y - 25, 8, 25);
      ctx.strokeRect(x - 16, y - 25, 8, 25);

      // Mattress & Quilted Blanket
      ctx.fillStyle = prop.variant && prop.variant % 2 === 0 ? '#991b1b' : '#065f46';
      ctx.fillRect(x - 8, y - 16, 23, 11);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(x - 8, y - 16, 23, 11);

      // Plump Linen Pillow
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 13, y - 17, 7, 9);
    } else if (prop.kind === 'table') {
      // Heavy Oak Dining / Council Table with Parchment Scroll, Goblet & Candle
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 15, y - 12, 4, 12);
      ctx.fillRect(x + 11, y - 12, 4, 12);

      // Isometric Table Top
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#271206';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 13);
      ctx.lineTo(x, y - 21);
      ctx.lineTo(x + 20, y - 13);
      ctx.lineTo(x, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Parchment scroll & golden goblet on table
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(x - 6, y - 15, 8, 5);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x + 6, y - 14, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'chair') {
      // Carved Oak Tavern / Manor Chair
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#271206';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 6, y - 10, 12, 4);
      ctx.strokeRect(x - 6, y - 10, 12, 4);
      ctx.fillRect(x - 6, y - 20, 3, 18);
      ctx.fillRect(x + 3, y - 10, 3, 8);
    } else if (prop.kind === 'bookshelf') {
      // Tall Medieval Archive Bookcase Filled with Leather Grimoires
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1c0a00';
      ctx.lineWidth = 1.4;
      ctx.fillRect(x - 14, y - 38, 28, 38);
      ctx.strokeRect(x - 14, y - 38, 28, 38);

      // 3 Rows of Colorful Spines
      const bookColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];
      for (let row = 0; row < 3; row++) {
        const ry = y - 34 + row * 11;
        ctx.fillStyle = '#271206';
        ctx.fillRect(x - 12, ry, 24, 9);
        for (let b = 0; b < 6; b++) {
          ctx.fillStyle = bookColors[(row * 3 + b) % bookColors.length];
          ctx.fillRect(x - 11 + b * 3.8, ry + 1, 3, 7.5);
        }
      }
    } else if (prop.kind === 'anvil') {
      // Heavy Forged Iron Blacksmith Anvil on Oak Stump
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 8, y - 11, 16, 11);
      ctx.strokeRect(x - 8, y - 11, 16, 11);

      // Iron Anvil Horn & Face
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 16);
      ctx.lineTo(x + 10, y - 19);
      ctx.lineTo(x + 16, y - 15);
      ctx.lineTo(x + 8, y - 11);
      ctx.lineTo(x - 9, y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (prop.kind === 'weapon_rack') {
      // Timber Armory Rack with Gleaming Steel Broadswords & Halberd
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 14, y - 30, 3, 30);
      ctx.fillRect(x + 11, y - 30, 3, 30);
      ctx.fillRect(x - 15, y - 22, 30, 3);
      ctx.fillRect(x - 15, y - 10, 30, 3);

      // Steel Blades resting on rack
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.2;
      for (const ox of [-7, 0, 7]) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y - 28);
        ctx.lineTo(x + ox, y - 6);
        ctx.stroke();
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(x + ox - 3, y - 22);
        ctx.lineTo(x + ox + 3, y - 22);
        ctx.stroke();
        ctx.strokeStyle = '#e2e8f0';
      }
    } else if (prop.kind === 'alchemy_table') {
      // Alchemist Workbench with Glowing Alembics & Potion Flasks
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#271206';
      ctx.lineWidth = 1.3;
      ctx.fillRect(x - 16, y - 18, 32, 18);
      ctx.strokeRect(x - 16, y - 18, 32, 18);

      // Glowing Emerald & Azure Potion Flasks
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(x - 7, y - 22, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x + 6, y - 23, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'well') {
      // Stone Village Well with Timber Pitched Canopy & Hanging Bucket
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Timber posts & small pitched shingle roof over well
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 14, y - 34, 3, 30);
      ctx.fillRect(x + 11, y - 34, 3, 30);
      ctx.fillStyle = '#9a4426';
      ctx.beginPath();
      ctx.moveTo(x - 19, y - 32);
      ctx.lineTo(x, y - 45);
      ctx.lineTo(x + 19, y - 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (prop.kind === 'street_lantern') {
      // Wrought-Iron Medieval Street Lamp Post with Hanging Warm Glass Lantern
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y - 44);
      ctx.lineTo(x + 10, y - 44);
      ctx.stroke();

      // Hanging Lantern Cage (fast translucent glow halo instead of shadowBlur)
      const glowActive = isNight;
      if (glowActive) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.beginPath();
        ctx.arc(x + 10, y - 36.5, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = glowActive ? '#fef08a' : '#cbd5e1';
      ctx.fillRect(x + 7, y - 41, 6, 9);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 7, y - 41, 6, 9);
    } else if (prop.kind === 'market_stall') {
      // Medieval Merchant Awning Stall with Striped Canopy & Goods
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 20, y - 14, 40, 14);
      ctx.fillRect(x - 18, y - 38, 3, 26);
      ctx.fillRect(x + 15, y - 38, 3, 26);

      // Striped Red/Cream Merchant Awning
      for (let s = 0; s < 5; s++) {
        ctx.fillStyle = s % 2 === 0 ? '#b91c1c' : '#fef3c7';
        ctx.fillRect(x - 22 + s * 8.8, y - 42, 8.8, 9);
      }
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - 22, y - 42, 44, 9);
    } else if (prop.kind === 'bench') {
      // Carved Timber Plaza Bench / Chapel Pew
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 16, y - 9, 32, 5);
      ctx.strokeRect(x - 16, y - 9, 32, 5);
      ctx.fillRect(x - 16, y - 16, 32, 5);
      ctx.strokeRect(x - 16, y - 16, 32, 5);
      ctx.fillRect(x - 14, y - 4, 3, 5);
      ctx.fillRect(x + 11, y - 4, 3, 5);
    } else if (prop.kind === 'brazier') {
      // Forged Iron Tripod Legs & Bowl
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 2);
      ctx.lineTo(x - 4, y - 9);
      ctx.moveTo(x + 8, y + 2);
      ctx.lineTo(x + 4, y - 9);
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x, y - 9);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 10, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Ember Bed
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(x, y - 10, 8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Multi-layered Animated Flame Plume
      const f1 = Math.sin(gameTime * 8 + x) * 1.8;
      const f2 = Math.cos(gameTime * 10 + y) * 1.4;

      ctx.fillStyle = prop.lightColor || '#f97316';
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 11);
      ctx.quadraticCurveTo(x - 4 + f1, y - 26, x + f2, y - 31 - Math.abs(f1));
      ctx.quadraticCurveTo(x + 5 + f1, y - 25, x + 7, y - 11);
      ctx.closePath();
      ctx.fill();

      // Inner White-Gold Flame Core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(x - 3.5, y - 11);
      ctx.quadraticCurveTo(x + f2 * 0.5, y - 21, x + f1 * 0.4, y - 24);
      ctx.quadraticCurveTo(x + 3.5, y - 18, x + 3.5, y - 11);
      ctx.closePath();
      ctx.fill();
    } else if (prop.kind === 'torch') {
      // Wall-Mounted Iron Sconce & Animated Torch Flame
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y - 22);
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 2, y - 26, 4, 12);

      const sway = Math.sin(gameTime * 9 + x) * 1.5;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(x - 4.5, y - 26);
      ctx.quadraticCurveTo(x + sway, y - 38, x + sway * 0.6, y - 41);
      ctx.quadraticCurveTo(x + 4.5, y - 34, x + 4.5, y - 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + sway * 0.3, y - 30, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'crystal') {
      // Multi-Spike Translucent Arcane/Glacial Crystal Cluster
      const spikes = [
        { ox: -6, oy: 0, tx: -11, ty: -22, w: 4.5, col: '#0284c7' },
        { ox: 6, oy: 1, tx: 12, ty: -20, w: 4.5, col: '#0369a1' },
        { ox: 0, oy: 2, tx: 0, ty: -34, w: 6.5, col: '#38bdf8' },
      ];
      for (const sp of spikes) {
        ctx.fillStyle = sp.col;
        ctx.beginPath();
        ctx.moveTo(x + sp.ox - sp.w, y + sp.oy);
        ctx.lineTo(x + sp.tx, y + sp.ty);
        ctx.lineTo(x + sp.ox + sp.w, y + sp.oy);
        ctx.closePath();
        ctx.fill();

        // Specular facet highlight
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + sp.ox, y + sp.oy);
        ctx.lineTo(x + sp.tx, y + sp.ty);
        ctx.stroke();
      }
    } else if (prop.kind === 'altar') {
      // Stepped Stone Ritual Dais + Blood Runner + Levitating Eldritch Orb
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#6d28d9';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 15, y - 14, 30, 14);
      ctx.strokeRect(x - 15, y - 14, 30, 14);

      // Crimson / Violet altar cloth runner
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(x - 5, y - 14, 10, 14);

      const orbY = y - 26 + Math.sin(gameTime * 3.5 + x) * 3;
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(x, orbY, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'pillar') {
      // 3D Isometric Fluted Stone Column with Plinth & Capital
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.fillRect(x - 12, y - 8, 24, 9);
      ctx.strokeRect(x - 12, y - 8, 24, 9);

      const colGrad = ctx.createLinearGradient(x - 9, y - 48, x + 9, y - 8);
      colGrad.addColorStop(0, '#64748b');
      colGrad.addColorStop(0.5, '#334155');
      colGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = colGrad;
      ctx.fillRect(x - 9, y - 48, 18, 40);
      ctx.strokeRect(x - 9, y - 48, 18, 40);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 46);
      ctx.lineTo(x - 3, y - 9);
      ctx.moveTo(x + 3, y - 46);
      ctx.lineTo(x + 3, y - 9);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 12, y - 53, 24, 6);
      ctx.strokeRect(x - 12, y - 53, 24, 6);
    } else if (prop.kind === 'sarcophagus') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 18, y);
      ctx.lineTo(x, y - 9);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x - 15, y - 5);
      ctx.lineTo(x, y - 13);
      ctx.lineTo(x + 15, y - 5);
      ctx.lineTo(x, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 5);
      ctx.lineTo(x + 8, y - 5);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y - 1);
      ctx.stroke();
    } else if (prop.kind === 'statue') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.fillRect(x - 11, y - 10, 22, 11);
      ctx.strokeRect(x - 11, y - 10, 22, 11);

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 10);
      ctx.lineTo(x - 10, y - 30);
      ctx.lineTo(x + 10, y - 30);
      ctx.lineTo(x + 8, y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x, y - 35, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.torchColor;
      ctx.beginPath();
      ctx.arc(x - 2, y - 35, 1.1, 0, Math.PI * 2);
      ctx.arc(x + 2, y - 35, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.lineTo(x, y - 6);
      ctx.moveTo(x - 5, y - 22);
      ctx.lineTo(x + 5, y - 22);
      ctx.stroke();
    } else if (prop.kind === 'arch') {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 24, y - 46, 8, 46);
      ctx.strokeRect(x - 24, y - 46, 8, 46);
      ctx.fillRect(x + 16, y - 46, 8, 46);
      ctx.strokeRect(x + 16, y - 46, 8, 46);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y - 42, 20, Math.PI, 0);
      ctx.stroke();
    } else if (prop.kind === 'barrel') {
      const bGrad = ctx.createLinearGradient(x - 8, y - 18, x + 8, y);
      bGrad.addColorStop(0, '#92400e');
      bGrad.addColorStop(0.5, '#78350f');
      bGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(x, y - 9, 8.5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y - 13, 8, 3, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 8, 3, 0, 0, Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(x, y - 17, 6.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (prop.kind === 'crate') {
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 9, y - 16, 18, 16);
      ctx.strokeRect(x - 9, y - 16, 18, 16);

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 15);
      ctx.lineTo(x + 8, y - 1);
      ctx.moveTo(x + 8, y - 15);
      ctx.lineTo(x - 8, y - 1);
      ctx.stroke();
    } else if (prop.kind === 'bones') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 2);
      ctx.lineTo(x + 7, y + 3);
      ctx.moveTo(x - 6, y + 4);
      ctx.lineTo(x + 8, y - 3);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - 3.2, y - 2, 1, 0, Math.PI * 2);
      ctx.arc(x - 0.8, y - 2, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'chains') {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 42);
      ctx.lineTo(x - 5, y - 12);
      ctx.moveTo(x + 5, y - 42);
      ctx.lineTo(x + 5, y - 16);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x - 5, y - 10, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 14, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (prop.kind === 'cobweb') {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 4) * Math.PI * 0.65 + Math.PI * 0.65;
        ctx.moveTo(x, y - 24);
        ctx.lineTo(x + Math.cos(a) * 18, y - 24 + Math.sin(a) * 18);
      }
      ctx.arc(x, y - 24, 7, Math.PI * 0.65, Math.PI * 1.3);
      ctx.arc(x, y - 24, 13, Math.PI * 0.65, Math.PI * 1.3);
      ctx.stroke();
    } else if (prop.kind === 'banner') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 38);
      ctx.lineTo(x + 8, y - 38);
      ctx.stroke();

      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 38);
      ctx.lineTo(x + 6, y - 38);
      ctx.lineTo(x + 6, y - 14);
      ctx.lineTo(x + 2, y - 19);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x - 3, y - 18);
      ctx.lineTo(x - 6, y - 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x - 5, y, 7, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(x + 5, y + 2, 6, 3.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, gameTime: number) {
    const hover = Math.sin(gameTime * 3) * 1.5;
    ctx.save();

    // Ground shadow + golden treasure glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Isometric Oak-and-Gold Treasure Chest
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.6;
    ctx.fillRect(x - 13, y - 15 + hover, 26, 15);
    ctx.strokeRect(x - 13, y - 15 + hover, 26, 15);

    // Vaulted Chest Lid
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(x, y - 15 + hover, 13, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Center Gold Lockplate & Gem
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x - 3, y - 11 + hover, 6, 6);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y - 8 + hover, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawExitPortal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gameTime: number,
    isTown = false
  ) {
    ctx.save();

    // Stone Portal Dais & Runic Steps
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Stone Archway Pillars framing the Vortex
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 22, y - 38, 6, 38);
    ctx.fillRect(x + 16, y - 38, 6, 38);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 34, 19, Math.PI, 0);
    ctx.stroke();

    // Swirling Eldritch Rift Vortex
    const pulse = Math.sin(gameTime * 5) * 2.5;
    const grad = ctx.createRadialGradient(x, y - 18, 2, x, y - 18, 22 + pulse);
    grad.addColorStop(0, '#f3e8ff');
    grad.addColorStop(0.45, '#c084fc');
    grad.addColorStop(0.8, '#6b21a8');
    grad.addColorStop(1, 'rgba(88, 28, 135, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y - 18, 17 + pulse * 0.5, 24 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText(isTown ? 'DUNGEON GATE [E / Click]' : 'NEXT FLOOR', x, y - 48);

    ctx.restore();
  }

  private drawFountain(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gameTime: number,
    atlas?: ReturnType<TileAtlasBank['getAtlas']>
  ) {
    if (atlas && atlas.fountainFrames.length > 0) {
      const frameIdx = Math.floor(gameTime * 9.0) & 7;
      ctx.drawImage(atlas.fountainFrames[frameIdx], x - 74, y - 92);
      return;
    }

    ctx.save();

    // 1. Ground Ambient Shadow & Outer Radial Stone Tile Ring (Reference Image 5 circular cobble ring)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 58, 29, 0, 0, Math.PI * 2);
    ctx.fill();

    // Circular Stepped Stone Tile Apron (16 radial wedge stone blocks)
    const apronRx = 54;
    const apronRy = 27;
    ctx.fillStyle = '#8b8378';
    ctx.strokeStyle = '#2b2520';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, apronRx, apronRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radial stone tile mortar joints around the circular plaza ring
    const radialSegments = 16;
    ctx.strokeStyle = 'rgba(38, 32, 26, 0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < radialSegments; i++) {
      const a = (i / radialSegments) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      ctx.moveTo(x + cosA * 40, y + 2 + sinA * 20);
      ctx.lineTo(x + cosA * apronRx, y + 2 + sinA * apronRy);
    }
    ctx.stroke();

    // 2. Lower Basin Cylindrical Carved Stone Masonry Wall (3D exterior front wall + top coping ring)
    const basinRx = 45;
    const basinRy = 22.5;
    const wallDrop = 9;

    // 3D front stone wall skirt of the circular basin
    const wallGrad = ctx.createLinearGradient(x - basinRx, y, x + basinRx, y + wallDrop);
    wallGrad.addColorStop(0, '#94a3b8');
    wallGrad.addColorStop(0.5, '#64748b');
    wallGrad.addColorStop(1, '#475569');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, basinRx, basinRy, 0, 0, Math.PI);
    ctx.lineTo(x - basinRx, y - 2 + wallDrop);
    ctx.ellipse(x, y - 2 + wallDrop, basinRx, basinRy, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Vertical chiseled stone block joints along the 3D basin wall
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      const jx = x + Math.cos(a) * basinRx;
      const jy = y - 2 + Math.sin(a) * basinRy;
      ctx.moveTo(jx, jy);
      ctx.lineTo(jx, jy + wallDrop);
    }
    ctx.stroke();

    // Top Carved Stone Coping Ring of Lower Basin (segmented radial stone tiles)
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, basinRx, basinRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sunlit bevel highlight on the stone rim
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y - 2.5, basinRx - 1.5, basinRy - 0.8, 0, Math.PI * 0.9, Math.PI * 1.95);
    ctx.stroke();

    // Radial stone joints on the basin rim coping
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.68)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      ctx.moveTo(x + cosA * 37, y - 2 + sinA * 18.5);
      ctx.lineTo(x + cosA * basinRx, y - 2 + sinA * basinRy);
    }
    ctx.stroke();

    // 3. Lower Basin Water Pool with Animated Sine Waves & Ripples
    const poolRx = 37;
    const poolRy = 18.5;
    const waterGrad = ctx.createRadialGradient(x, y - 2, 4, x, y - 2, poolRx);
    waterGrad.addColorStop(0, '#38bdf8');
    waterGrad.addColorStop(0.6, '#0284c7');
    waterGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, poolRx, poolRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing sine-wave ripples across the lower pool surface
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y - 2, poolRx - 1, poolRy - 0.5, 0, 0, Math.PI * 2);
    ctx.clip();

    for (let wIdx = -2; wIdx <= 2; wIdx++) {
      const baseWy = y - 2 + wIdx * 5.2;
      ctx.strokeStyle = wIdx % 2 === 0 ? 'rgba(224, 242, 254, 0.52)' : 'rgba(125, 211, 252, 0.38)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let sx = -poolRx; sx <= poolRx; sx += 4) {
        const sy = baseWy + Math.sin(sx * 0.24 - gameTime * 4.5 + wIdx * 1.3) * 1.6;
        if (sx === -poolRx) ctx.moveTo(x + sx, sy);
        else ctx.lineTo(x + sx, sy);
      }
      ctx.stroke();
    }

    // Expanding concentric wave rings from the cascading waterfall
    for (let ring = 0; ring < 2; ring++) {
      const prog = ((gameTime * 0.85 + ring * 0.5) % 1);
      const rRx = 18 + prog * 18;
      const rRy = 9 + prog * 9;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - prog) * 0.65})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, rRx, rRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Lower Stone Pedestal Column & Middle Carved Stone Basin (at y - 22)
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.3;
    ctx.fillRect(x - 10, y - 22, 20, 18);
    ctx.strokeRect(x - 10, y - 22, 20, 18);

    // Middle Circular Carved Stone Bowl (y - 22)
    const midY = y - 22;
    const midRx = 24;
    const midRy = 12;

    // Bowl underside stone masonry
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, midY + 4, midRx * 0.85, midRy * 0.85, 0, 0, Math.PI);
    ctx.lineTo(x - midRx, midY);
    ctx.lineTo(x + midRx, midY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Middle Stone Rim with radial stone block joints
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, midY, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * 18, midY + Math.sin(a) * 9);
      ctx.lineTo(x + Math.cos(a) * midRx, midY + Math.sin(a) * midRy);
    }
    ctx.stroke();

    // Middle Bowl Water Pool
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.ellipse(x, midY, 19, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Animated Sine-Wave Waterfall Curtain Flowing Down from Middle Stone Bowl into Lower Pool!
    const numStreams = 9;
    ctx.lineCap = 'round';
    for (let s = 0; s < numStreams; s++) {
      // Spread streams across the front arc of the circular stone bowl (angle from 0.12*PI to 0.88*PI)
      const angle = (0.12 + (s / (numStreams - 1)) * 0.76) * Math.PI;
      const topX = x + Math.cos(angle) * (midRx - 1);
      const topY = midY + Math.sin(angle) * (midRy - 0.5);
      const botY = topY + 19;

      // Translucent cyan water ribbon base
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.52)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let step = 0; step <= 6; step++) {
        const frac = step / 6;
        const py = topY + frac * (botY - topY);
        const sineWave = Math.sin(frac * Math.PI * 2.5 - gameTime * 9.0 + s * 0.85) * 1.7;
        const px = topX + sineWave;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Bright white-aqua sine-wave crest flowing downward
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.82)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let step = 0; step <= 6; step++) {
        const frac = step / 6;
        const py = topY + frac * (botY - topY);
        const sineWave = Math.sin(frac * Math.PI * 2.5 - gameTime * 9.0 + s * 0.85) * 1.7;
        const px = topX + sineWave;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Foaming splash ring where each sine-wave stream hits the lower pool
      const foamRadius = 2.2 + Math.sin(gameTime * 8 + s * 1.5) * 0.8;
      ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
      ctx.beginPath();
      ctx.ellipse(topX, botY, foamRadius * 1.4, foamRadius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Descending horizontal sine-wave water rings along the waterfall curtain
    for (let wRing = 0; wRing < 2; wRing++) {
      const fallFrac = (gameTime * 1.6 + wRing * 0.5) % 1;
      const dropY = fallFrac * 18;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - fallFrac * 0.5) * 0.65})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (0.12 + (i / 16) * 0.76) * Math.PI;
        const wx = x + Math.cos(a) * (midRx - 0.5);
        const wy =
          midY +
          Math.sin(a) * midRy +
          dropY +
          Math.sin(i * 1.1 - gameTime * 8.0) * 1.3;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }

    // 6. Upper Carved Stone Pedestal & Top Crown Spout Tier (y - 38)
    const topTierY = y - 38;
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x - 6, topTierY, 12, 16);
    ctx.strokeRect(x - 6, topTierY, 12, 16);

    // Top Circular Carved Stone Crown Bowl
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(x, topTierY, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bubbling water dome & downward-flowing sine-wave streams from top crown into middle bowl
    const spoutPulse = Math.sin(gameTime * 6) * 1.5;
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.ellipse(x, topTierY - 2 + spoutPulse * 0.3, 6.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let u = 0; u < 5; u++) {
      const a = (0.15 + (u / 4) * 0.7) * Math.PI;
      const ux = x + Math.cos(a) * 11;
      const uy = topTierY + Math.sin(a) * 5.5;
      const uBotY = uy + 14;

      ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let step = 0; step <= 5; step++) {
        const frac = step / 5;
        const py = uy + frac * (uBotY - uy);
        const sx = ux + Math.sin(frac * Math.PI * 2 - gameTime * 9.5 + u) * 1.3;
        if (step === 0) ctx.moveTo(sx, py);
        else ctx.lineTo(sx, py);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('SANCTUARY FOUNTAIN', x, y - 50);

    ctx.restore();
  }

  private drawLootDrop(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    drop: LootDropEntity,
    gameTime: number
  ) {
    const def = getItemDef(drop.item.itemDefId);
    if (!def) return;

    const bob = Math.sin(gameTime * 4 + drop.x) * 3;
    let color = '#94a3b8';
    if (def.rarity === ItemRarity.Uncommon) color = '#4ade80';
    else if (def.rarity === ItemRarity.Rare) color = '#38bdf8';
    else if (def.rarity === ItemRarity.Epic) color = '#c084fc';
    else if (def.rarity === ItemRarity.Legendary) color = '#fb923c';

    ctx.save();

    // Vertical Rarity Light Pillar
    const grad = ctx.createLinearGradient(x, y, x, y - 48);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = (def.rarity ?? 0) >= ItemRarity.Rare ? 0.55 : 0.3;
    ctx.fillRect(x - 4, y - 48, 8, 48);
    ctx.globalAlpha = 1;

    // Ground rune ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating Gem/Relic Icon
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 + bob);
    ctx.lineTo(x + 6, y - 8 + bob);
    ctx.lineTo(x, y - 2 + bob);
    ctx.lineTo(x - 6, y - 8 + bob);
    ctx.closePath();
    ctx.fill();

    // Crisp Item Label Pill
    const label = drop.item.upgradeLevel ? `${def.name} +${drop.item.upgradeLevel}` : def.name;
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.86)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.9;
    ctx.fillRect(x - textW / 2, y - 30 + bob, textW, 14);
    ctx.strokeRect(x - textW / 2, y - 30 + bob, textW, 14);

    ctx.fillStyle = color;
    ctx.fillText(label, x, y - 20 + bob);

    ctx.restore();
  }

  private drawProjectile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    proj: Projectile,
    gameTime: number
  ) {
    ctx.save();
    const isoAngle = worldAngleToIsoAngle(Math.atan2(proj.vy, proj.vx));

    if (proj.school === 0) {
      // Physical Arrow / Bolt with Feathered Fletching & Steel Broadhead
      ctx.translate(x, y);
      ctx.rotate(isoAngle);

      // Motion streak
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Arrow Shaft
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      // Steel Broadhead
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(6, -3);
      ctx.lineTo(6, 3);
      ctx.closePath();
      ctx.fill();
    } else if (proj.school === 1) {
      // INFERNO BURST / FIREBALL: Layered Blazing Core + Outer Flame Corona + Comet Tail
      ctx.translate(x, y);
      ctx.rotate(isoAngle);

      const tailGrad = ctx.createLinearGradient(-26, 0, 6, 0);
      tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      tailGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.75)');
      tailGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(2, -proj.radius * 0.9);
      ctx.lineTo(2, proj.radius * 0.9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(1, 0, proj.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Arcane / Shadow / Frost Orb with Orbiting Runic Ring
      ctx.translate(x, y);
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, proj.radius * 1.4, proj.radius * 0.6, gameTime * 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawGroundDecalParticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    p: Particle,
    gameTime: number
  ) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const progress = 1 - alpha;
    ctx.save();

    if (p.kind === 'frost_nova') {
      // FROST NOVA: Expanding True-Radius Glacial Ring + Crystalline Floor Glyph + Ice Spikes
      const maxRx = p.size * (this.isoTileW / 64);
      const maxRy = p.size * (this.isoTileH / 64);
      const currentRx = maxRx * Math.min(1, 0.25 + progress * 1.35);
      const currentRy = maxRy * Math.min(1, 0.25 + progress * 1.35);

      ctx.globalAlpha = alpha * 0.85;
      const frostGrad = ctx.createRadialGradient(x, y, 4, x, y, currentRx);
      frostGrad.addColorStop(0, 'rgba(186, 230, 253, 0.15)');
      frostGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.38)');
      frostGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
      ctx.fillStyle = frostGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, currentRx, currentRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer Freezing Wave Ring
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, currentRx, currentRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 8 Crystalline Snowflake Spokes & Jutting Perimeter Ice Spikes
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const ex = x + Math.cos(a) * currentRx * 0.92;
        const ey = y + Math.sin(a) * currentRy * 0.92;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 3D Ice Spike jutting upward at the spoke tip
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey);
        ctx.lineTo(ex, ey - 16 * alpha);
        ctx.lineTo(ex + 4, ey);
        ctx.closePath();
        ctx.fill();
      }
    } else if (p.kind === 'scorch') {
      // INFERNO BURST: Molten Scorch Crater & Glowing Magma Fissures
      const rx = p.size;
      const ry = p.size * 0.5;
      ctx.globalAlpha = alpha * 0.8;

      const scorchGrad = ctx.createRadialGradient(x, y, 2, x, y, rx);
      scorchGrad.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
      scorchGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.55)');
      scorchGrad.addColorStop(0.75, 'rgba(15, 23, 42, 0.75)');
      scorchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = scorchGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'shockwave' || p.kind === 'ring') {
      const r = p.size * (0.35 + progress * 0.85);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.kind === 'shockwave' ? 3.2 : 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawElevatedParticle(ctx: CanvasRenderingContext2D, x: number, y: number, p: Particle) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.kind === 'slash') {
      // TWIN CLEAVE: Sweeping Crescent Blade Wave
      const isoAngle = worldAngleToIsoAngle(p.angle ?? 0);
      ctx.translate(x, y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, isoAngle - 0.95, isoAngle + 0.95);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 * alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.88, p.size * 0.45, 0, isoAngle - 0.75, isoAngle + 0.75);
      ctx.stroke();
    } else if (p.kind === 'shard') {
      // 3D Crystalline Frost / Bone Shard
      ctx.translate(x, y);
      ctx.rotate(p.angle ?? 0.4);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.6);
      ctx.lineTo(p.size * 0.7, 0);
      ctx.lineTo(0, p.size * 1.2);
      ctx.lineTo(-p.size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.kind === 'bone_frag') {
      ctx.translate(x, y);
      ctx.rotate((p.angle ?? 0) + alpha * 6);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
    } else if (p.kind === 'ember') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, p.size * 0.45 * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawDynamicLighting(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    isPlayerAttacking: boolean,
    lights: DynamicLightSource[],
    _theme: DungeonThemeConfig,
    isTown: boolean,
    gameTime: number,
    daylight?: DaylightState
  ) {
    // Fast path for bright overworld midday when darkness is negligible
    if (isTown && daylight && daylight.ambientDarkness <= 0.015 && !daylight.isNightLightsOn) {
      return;
    }

    const flicker = 1 + Math.sin(gameTime * 9) * 0.025 + Math.cos(gameTime * 15) * 0.015;
    const isNightInTown = isTown && daylight ? daylight.isNightLightsOn : false;
    const lanternFactor = isTown && daylight ? (daylight.lanternIntensity ?? (isNightInTown ? 1 : 0)) : 1;
    const heroRadius = (isTown ? (isNightInTown ? 265 : 340) : 255) * flicker;

    // 1. Offscreen Multiplicative Darkness & Light Cutout Composite (Quarter-Resolution for 4x speed)
    if (this.lightmapCanvas && this.lightmapCtx) {
      const lctx = this.lightmapCtx;
      const lw = this.lightmapCanvas.width;
      const lh = this.lightmapCanvas.height;
      const scaleX = lw / this.width;
      const scaleY = lh / this.height;

      lctx.save();
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, lw, lh);

      // Smoothly interpolated ambient darkness driven by 24-hour DaylightState in Town-1, or deep abyss darkness in Dungeon
      if (isTown && daylight) {
        const darkAlpha = Math.min(0.68, Math.max(0.0, daylight.ambientDarkness));
        const [r, g, b] = daylight.shadowTintRgb ?? [10, 18, 36];
        lctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${darkAlpha.toFixed(3)})`;
      } else {
        lctx.fillStyle = isTown ? 'rgba(12, 19, 34, 0.14)' : 'rgba(3, 5, 10, 0.78)';
      }
      lctx.fillRect(0, 0, lw, lh);

      // Cut out soft radial light fields using destination-out with pre-baked cutout sprite
      lctx.globalCompositeOperation = 'destination-out';

      const punchLight = (sx: number, sy: number, radius: number, strength: number) => {
        if (strength <= 0.01) return;
        const lx = sx * scaleX;
        const ly = sy * scaleY;
        const lr = Math.max(4, radius * scaleX);
        if (this.lightCutoutSprite) {
          lctx.globalAlpha = Math.min(1, strength);
          lctx.drawImage(this.lightCutoutSprite, lx - lr, ly - lr, lr * 2, lr * 2);
        } else {
          const grad = lctx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
          grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1, strength)})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lctx.fillStyle = grad;
          lctx.beginPath();
          lctx.arc(lx, ly, lr, 0, Math.PI * 2);
          lctx.fill();
        }
      };

      // Hero lantern light cutout
      punchLight(playerX, playerY - 16, heroRadius, 0.96);

      // Environmental, Window, Street Lantern, & Spell light cutouts
      for (const l of lights) {
        if (l.x < -220 || l.x > this.width + 220 || l.y < -220 || l.y > this.height + 220) {
          continue;
        }
        punchLight(l.x, l.y, l.radius, l.intensity);
      }

      lctx.globalAlpha = 1;
      lctx.restore();

      // Composite the offscreen lightmap over the main gameplay viewport
      ctx.save();
      ctx.drawImage(this.lightmapCanvas, 0, 0, this.width, this.height);
      ctx.restore();
    }

    // 2. Local Warm Torch, Street Lantern, Hearth, Window, & Spell Colored Illumination (No full-screen red wash!)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const bloomBoost = isTown ? 0.05 + 0.06 * lanternFactor : 0.09;
    for (const l of lights) {
      if (l.intensity <= 0.02 || l.x < -160 || l.x > this.width + 160 || l.y < -160 || l.y > this.height + 160) {
        continue;
      }
      const r = l.radius * 0.45;
      ctx.globalAlpha = bloomBoost * l.intensity;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isPlayerAttacking || (isNightInTown && lanternFactor > 0.1)) {
      ctx.globalAlpha = isPlayerAttacking ? 0.09 : 0.06 * lanternFactor;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(playerX, playerY - 16, isPlayerAttacking ? 95 : 80, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawAtmosphericMotes(
    ctx: CanvasRenderingContext2D,
    _camera: Camera,
    theme: DungeonThemeConfig,
    isTown: boolean,
    gameTime: number
  ) {
    if (isTown) return;
    // Subtle atmospheric dungeon depth fog at viewport perimeter
    ctx.save();
    const outerRadius = Math.hypot(this.width, this.height) * 0.55;
    const innerRadius = Math.min(this.width, this.height) * 0.34;
    const fogGrad = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      innerRadius,
      this.width * 0.5,
      this.height * 0.5,
      outerRadius
    );
    const pulse = 0.24 + Math.sin(gameTime * 1.5) * 0.03;
    fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fogGrad.addColorStop(0.75, theme.fogColor || 'rgba(15, 23, 42, 0.14)');
    fogGrad.addColorStop(1, `rgba(2, 4, 9, ${pulse.toFixed(2)})`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
