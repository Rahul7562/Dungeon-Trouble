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
  private dwBuf: Int16Array;
  private dhBuf: Int16Array;
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
    this.dwBuf = new Int16Array(capacity);
    this.dhBuf = new Int16Array(capacity);
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
    alpha = 1.0,
    dw = sw,
    dh = sh
  ): void {
    if (this.count >= this.capacity) return;
    const idx = this.count++;
    this.sxBuf[idx] = sx;
    this.syBuf[idx] = sy;
    this.swBuf[idx] = sw;
    this.shBuf[idx] = sh;
    this.dxBuf[idx] = dx;
    this.dyBuf[idx] = dy;
    this.dwBuf[idx] = dw;
    this.dhBuf[idx] = dh;
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
      ctx.drawImage(
        sheet,
        this.sxBuf[i],
        this.syBuf[i],
        this.swBuf[i],
        this.shBuf[i],
        this.dxBuf[i],
        this.dyBuf[i],
        this.dwBuf[i],
        this.dhBuf[i]
      );
    }
    if (currentAlpha !== 1.0) {
      ctx.globalAlpha = 1.0;
    }
    this.count = 0;
  }
}

const DEPTH_WALL = 1;
const DEPTH_CHEST = 2;
const DEPTH_PORTAL = 3;
const DEPTH_PROP = 4;
const DEPTH_LOOT = 5;
const DEPTH_AFTERIMAGE = 6;
const DEPTH_ENEMY = 7;
const DEPTH_NPC = 8;
const DEPTH_SUMMON = 9;
const DEPTH_FOUNTAIN = 10;
const DEPTH_PLAYER = 11;
const MAX_DEPTH_ITEMS = 2048;
const MAX_DYNAMIC_LIGHTS = 128;

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

  // Zero-allocation depth-sort buffers
  private depthValBuf = new Float32Array(MAX_DEPTH_ITEMS);
  private depthKindBuf = new Uint8Array(MAX_DEPTH_ITEMS);
  private depthPosXBuf = new Int16Array(MAX_DEPTH_ITEMS);
  private depthPosYBuf = new Int16Array(MAX_DEPTH_ITEMS);
  private depthArg1Buf = new Int16Array(MAX_DEPTH_ITEMS);
  private depthArg2Buf = new Int16Array(MAX_DEPTH_ITEMS);
  private depthAlphaBuf = new Float32Array(MAX_DEPTH_ITEMS);
  private depthOrder: number[] = [];
  private depthPropRefs: DungeonProp[] = [];

  // Zero-allocation dynamic lights pool
  private lightPool: DynamicLightSource[] = Array.from({ length: MAX_DYNAMIC_LIGHTS }, () => ({
    x: 0,
    y: 0,
    radius: 0,
    color: '#ffffff',
    intensity: 0,
  }));
  private lightCount = 0;

  private lightmapCanvas: HTMLCanvasElement | null = null;
  private lightmapCtx: CanvasRenderingContext2D | null = null;
  private lightCutoutSprite: HTMLCanvasElement | null = null;
  private coloredLightSprites = new Map<string, HTMLCanvasElement>();
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogThemeId = '';
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

  private pushDynamicLight(x: number, y: number, radius: number, color: string, intensity: number): void {
    if (this.lightCount >= MAX_DYNAMIC_LIGHTS) return;
    if (x < -240 || x > this.width + 240 || y < -240 || y > this.height + 240) return;
    const l = this.lightPool[this.lightCount++];
    l.x = x;
    l.y = y;
    l.radius = radius;
    l.color = color;
    l.intensity = intensity;
  }

  private getColoredLightSprite(color: string): HTMLCanvasElement | null {
    const cached = this.coloredLightSprites.get(color);
    if (cached) return cached;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const cctx = c.getContext('2d');
    if (!cctx) return null;
    const grad = cctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    grad.addColorStop(0.0, color);
    grad.addColorStop(0.42, color);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, 64, 64);
    this.coloredLightSprites.set(color, c);
    return c;
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

      // Pre-bake 128x128 natural multi-lobe inverse-square light diffusion sprite (eliminates hard circular rings)
      const lc = document.createElement('canvas');
      lc.width = 128;
      lc.height = 128;
      const lcCtx = lc.getContext('2d');
      if (lcCtx) {
        // Primary smooth inverse-square atmospheric diffusion core
        const grad = lcCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
        grad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.18, 'rgba(0, 0, 0, 0.92)');
        grad.addColorStop(0.38, 'rgba(0, 0, 0, 0.72)');
        grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.44)');
        grad.addColorStop(0.76, 'rgba(0, 0, 0, 0.19)');
        grad.addColorStop(0.90, 'rgba(0, 0, 0, 0.06)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        lcCtx.fillStyle = grad;
        lcCtx.fillRect(0, 0, 128, 128);

        // Soft asymmetric organic scatter lobes so light diffuses naturally rather than a geometric circle
        const lobes = [
          { ox: -10, oy: 4, rx: 48, ry: 34, rot: 0.25, a: 0.24 },
          { ox: 11, oy: -3, rx: 46, ry: 36, rot: -0.3, a: 0.22 },
          { ox: 2, oy: 9, rx: 42, ry: 44, rot: 0.5, a: 0.18 },
        ];
        for (const lb of lobes) {
          lcCtx.save();
          lcCtx.translate(64 + lb.ox, 64 + lb.oy);
          lcCtx.rotate(lb.rot);
          lcCtx.scale(1, lb.ry / lb.rx);
          const lg = lcCtx.createRadialGradient(0, 0, 2, 0, 0, lb.rx);
          lg.addColorStop(0, `rgba(0, 0, 0, ${lb.a})`);
          lg.addColorStop(0.6, `rgba(0, 0, 0, ${lb.a * 0.4})`);
          lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lcCtx.fillStyle = lg;
          lcCtx.beginPath();
          lcCtx.arc(0, 0, lb.rx, 0, Math.PI * 2);
          lcCtx.fill();
          lcCtx.restore();
        }
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
    this.fogThemeId = '';
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
    return map.isPerimeterWall(tx, ty);
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

    this.lightCount = 0;
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
          } else if (!map.isPerimeterWall(tx, ty)) {
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

        const wallNorth = map.get(tx, ty - 1) === TileType.Wall;
        const wallWest = map.get(tx - 1, ty) === TileType.Wall;
        if ((wallNorth || wallWest) && shadowCount < 2048) {
          this.shadowQueueX[shadowCount] = posX;
          this.shadowQueueY[shadowCount] = posY;
          this.shadowQueueKind[shadowCount] = wallNorth && wallWest ? 3 : wallNorth ? 1 : 2;
          shadowCount++;
        }

        if (type === TileType.Lava) {
          this.pushDynamicLight(posX, posY, 95, '#f97316', 0.45);
        } else if (type === TileType.Exit) {
          this.pushDynamicLight(posX, posY - 16, 170, '#c084fc', 0.85);
        } else if (type === TileType.Chest) {
          this.pushDynamicLight(posX, posY - 8, 110, '#fbbf24', 0.55);
        }
      }
    }

    if (atlas) {
      this.spriteBatcher.flush(ctx, atlas.masterSheet);
    }

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

    // 1.2 Render Ground-Layer Combat Decals
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.kind === 'frost_nova' || p.kind === 'scorch' || p.kind === 'shockwave' || p.kind === 'ring') {
        const pos = this.worldToScreen(p.x, p.y, 0, camera);
        this.drawGroundDecalParticle(ctx, pos.x, pos.y, p, gameTime);
        if (p.kind === 'frost_nova' || p.kind === 'scorch') {
          this.pushDynamicLight(
            pos.x,
            pos.y,
            p.size * 1.4,
            p.color,
            Math.max(0, (p.life / p.maxLife) * 0.8)
          );
        }
      }
    }

    // 1.5 Render Ground Warning Telegraphs
    for (let i = 0; i < telegraphs.length; i++) {
      const tele = telegraphs[i];
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

    const spatialIndex = isTown ? townData?.spatialIndex : undefined;
    const chunkStartX = spatialIndex ? Math.max(0, startX >> 3) : 0;
    const chunkEndX = spatialIndex ? Math.min(spatialIndex.cols - 1, endX >> 3) : -1;
    const chunkStartY = spatialIndex ? Math.max(0, startY >> 3) : 0;
    const chunkEndY = spatialIndex ? Math.min(spatialIndex.rows - 1, endY >> 3) : -1;

    // 1.1 Render Flat Interior Rugs on Floor Layer
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
      for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        if (prop.kind === 'rug') {
          const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
          if (pos.x >= -150 && pos.x <= this.width + 150 && pos.y >= -150 && pos.y <= this.height + 150) {
            this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme, daylight.isNightLightsOn);
          }
        }
      }
    }

    // 2. Collect all depth-sorted renderables into zero-allocation typed buffers
    let depthCount = 0;
    this.depthPropRefs.length = 0;
    const pushDepthItem = (
      depth: number,
      kind: number,
      posX: number,
      posY: number,
      arg1 = 0,
      arg2 = 0,
      alpha = 1.0
    ) => {
      if (depthCount >= MAX_DEPTH_ITEMS) return;
      const idx = depthCount++;
      this.depthValBuf[idx] = depth;
      this.depthKindBuf[idx] = kind;
      this.depthPosXBuf[idx] = posX;
      this.depthPosYBuf[idx] = posY;
      this.depthArg1Buf[idx] = arg1;
      this.depthArg2Buf[idx] = arg2;
      this.depthAlphaBuf[idx] = alpha;
    };

    const playerTile = map.worldToTile(player.x, player.y);

    // Perimeter 3D Walls, Trees, Chests, and Exit Portals
    if (spatialIndex && tileFlags && wallBuildingIdx && townData) {
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
                  this.pushDynamicLight(posX, posY - 22, 145, '#fbbf24', 0.72 * lanternFactor);
                }
              }
            }

            pushDepthItem(
              (cellX + cellY) * 64,
              DEPTH_WALL,
              posX,
              posY,
              tx,
              ty | (isOuterTree ? 0x4000 : 0),
              wallAlpha
            );
          }
        }
      }

      if (townData.dungeonPortalPos) {
        const portalPos = this.worldToScreen(townData.dungeonPortalPos.x, townData.dungeonPortalPos.y, 0, camera);
        if (
          portalPos.x >= -160 &&
          portalPos.x <= this.width + 160 &&
          portalPos.y >= -160 &&
          portalPos.y <= this.height + 160
        ) {
          pushDepthItem(
            townData.dungeonPortalPos.x + townData.dungeonPortalPos.y,
            DEPTH_PORTAL,
            portalPos.x,
            portalPos.y,
            1
          );
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
                : map.isPerimeterWall(tx, ty);
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
            if (
              tx >= playerTile.x &&
              ty >= playerTile.y &&
              tx - playerTile.x <= 2 &&
              ty - playerTile.y <= 2 &&
              tx + ty > playerTile.x + playerTile.y
            ) {
              wallAlpha = 0.35;
            }

            if (isTown && !isOuterTree && wallBuildingIdx && tileFlags) {
              const bIdx = wallBuildingIdx[tileIdx];
              if (bIdx >= 0) {
                if (bIdx === activeBuildingIndex) {
                  wallAlpha = (flags & TOWN_TILE_FLAG_FRONT_WALL) !== 0 ? 0.18 : 0.72;
                }
                if (daylight.isNightLightsOn && (flags & TOWN_TILE_FLAG_WINDOW) !== 0) {
                  const lanternFactor = daylight.lanternIntensity ?? 1.0;
                  this.pushDynamicLight(posX, posY - 22, 145, '#fbbf24', 0.72 * lanternFactor);
                }
              }
            }

            pushDepthItem(
              (cellX + cellY) * 64,
              DEPTH_WALL,
              posX,
              posY,
              tx,
              ty | (isOuterTree ? 0x4000 : 0),
              wallAlpha
            );
          } else if (type === TileType.Chest) {
            const cellX = tx + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -140 || posX > this.width + 140 || posY < -140 || posY > this.height + 140) {
              continue;
            }
            pushDepthItem((cellX + cellY) * 64, DEPTH_CHEST, posX, posY);
          } else if (type === TileType.Exit) {
            const cellX = tx + 0.5;
            const posX = Math.round((cellX - cellY) * 32 + halfW);
            const posY = Math.round((cellX + cellY) * 16 + halfH);
            if (posX < -160 || posX > this.width + 160 || posY < -160 || posY > this.height + 160) {
              continue;
            }
            pushDepthItem((cellX + cellY) * 64, DEPTH_PORTAL, posX, posY, isTown ? 1 : 0);
          }
        }
      }
    }

    // Handcrafted Environmental & Interior Props
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
                this.pushDynamicLight(
                  pos.x,
                  pos.y - 16,
                  isStreetLamp ? prop.lightRadius * (0.85 + 0.3 * lanternFactor) : prop.lightRadius,
                  prop.lightColor,
                  isStreetLamp ? 0.92 * lanternFactor : 0.8
                );
              }
            }
            const pIdx = this.depthPropRefs.length;
            this.depthPropRefs.push(prop);
            pushDepthItem(prop.x + prop.y, DEPTH_PROP, pos.x, pos.y, pIdx);
          }
        }
      }
    } else {
      for (let i = 0; i < props.length; i++) {
        const prop = props[i];
        if (prop.kind === 'rug') continue;
        const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
        if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
          continue;
        }
        if (prop.lightColor && prop.lightRadius) {
          const isStreetLamp = prop.kind === 'street_lantern';
          const activeLight = !isStreetLamp || daylight.isNightLightsOn;
          if (activeLight) {
            this.pushDynamicLight(
              pos.x,
              pos.y - 16,
              isStreetLamp ? prop.lightRadius * (0.85 + 0.3 * lanternFactor) : prop.lightRadius,
              prop.lightColor,
              isStreetLamp ? 0.92 * lanternFactor : 0.8
            );
          }
        }
        const pIdx = this.depthPropRefs.length;
        this.depthPropRefs.push(prop);
        pushDepthItem(prop.x + prop.y, DEPTH_PROP, pos.x, pos.y, pIdx);
      }
    }

    // Loot Drops
    for (let i = 0; i < lootDrops.length; i++) {
      const drop = lootDrops[i];
      const pos = this.worldToScreen(drop.x, drop.y, 0, camera);
      const def = getItemDef(drop.item.itemDefId);
      if (def && (def.rarity ?? 0) >= ItemRarity.Rare) {
        this.pushDynamicLight(
          pos.x,
          pos.y - 10,
          90,
          def.rarity === ItemRarity.Legendary
            ? '#f97316'
            : def.rarity === ItemRarity.Epic
            ? '#c084fc'
            : '#38bdf8',
          0.65
        );
      }
      pushDepthItem(drop.x + drop.y, DEPTH_LOOT, pos.x, pos.y, i);
    }

    // Dash Afterimages
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.kind === 'afterimage') {
        const pos = this.worldToScreen(p.x, p.y, 0, camera);
        const alpha = Math.max(0, (p.life / p.maxLife) * 0.55);
        pushDepthItem(p.x + p.y - 2, DEPTH_AFTERIMAGE, pos.x, pos.y, i, 0, alpha);
      }
    }

    // Enemies
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const pos = this.worldToScreen(enemy.x, enemy.y, enemy.z, camera);
      if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
        continue;
      }
      if (enemy.archetype === 'dungeon_lord' || enemy.isElite) {
        this.pushDynamicLight(
          pos.x,
          pos.y - 18,
          enemy.archetype === 'dungeon_lord' ? 165 : 105,
          enemy.archetype === 'dungeon_lord' ? '#ef4444' : '#f59e0b',
          0.55
        );
      }
      pushDepthItem(enemy.x + enemy.y, DEPTH_ENEMY, pos.x, pos.y, i);
    }

    // Town NPCs
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const pos = this.worldToScreen(npc.x, npc.y, 0, camera);
      if (pos.x < -220 || pos.x > this.width + 220 || pos.y < -220 || pos.y > this.height + 220) {
        continue;
      }
      const isNear = activeNPC !== null && activeNPC.id === npc.id;
      if (isTown && daylight.isNightLightsOn && npc.carriesLantern !== false) {
        this.pushDynamicLight(pos.x, pos.y - 18, 165, '#fbbf24', 0.85 * lanternFactor);
      }
      pushDepthItem(npc.x + npc.y, DEPTH_NPC, pos.x, pos.y, i, isNear ? 1 : 0);
    }

    // Summons
    for (let i = 0; i < summons.length; i++) {
      const summon = summons[i];
      const pos = this.worldToScreen(summon.x, summon.y, 0, camera);
      pushDepthItem(summon.x + summon.y, DEPTH_SUMMON, pos.x, pos.y, i);
    }

    // Fountain
    if (fountainPos) {
      const pos = this.worldToScreen(fountainPos.x, fountainPos.y, 0, camera);
      this.pushDynamicLight(pos.x, pos.y - 16, 230, '#38bdf8', 0.88);
      pushDepthItem(fountainPos.x + fountainPos.y, DEPTH_FOUNTAIN, pos.x, pos.y);
    }

    // Hero (Player)
    const playerPos = this.worldToScreen(player.x, player.y, 0, camera);
    pushDepthItem(player.x + player.y, DEPTH_PLAYER, playerPos.x, playerPos.y);

    // Sort indices by depth without allocating closures
    const order = this.depthOrder;
    order.length = depthCount;
    for (let i = 0; i < depthCount; i++) {
      order[i] = i;
    }
    const depthVals = this.depthValBuf;
    order.sort((a, b) => depthVals[a] - depthVals[b]);

    this.spriteBatcher.clear();
    const flushBatcher = () => {
      if (atlas) {
        this.spriteBatcher.flush(ctx, atlas.masterSheet);
      }
    };

    for (let i = 0; i < depthCount; i++) {
      const idx = order[i];
      const kind = this.depthKindBuf[idx];
      const px = this.depthPosXBuf[idx];
      const py = this.depthPosYBuf[idx];
      const a1 = this.depthArg1Buf[idx];
      const a2 = this.depthArg2Buf[idx];

      if (kind === DEPTH_WALL) {
        this.drawWallBlock(
          ctx,
          px,
          py,
          a1,
          a2 & 0x3fff,
          theme,
          isTown,
          atlas,
          this.depthAlphaBuf[idx],
          (a2 & 0x4000) !== 0,
          gameTime
        );
      } else if (kind === DEPTH_FOUNTAIN) {
        this.drawFountain(ctx, px, py, gameTime, atlas);
      } else {
        flushBatcher();
        switch (kind) {
          case DEPTH_PROP:
            this.drawProp(
              ctx,
              px,
              py,
              this.depthPropRefs[a1],
              gameTime,
              theme,
              daylight.isNightLightsOn
            );
            break;
          case DEPTH_ENEMY:
            drawEnemyRig(ctx, px, py, enemies[a1], gameTime);
            break;
          case DEPTH_NPC:
            drawNPCRig(
              ctx,
              px,
              py,
              npcs[a1],
              a2 === 1,
              gameTime,
              isTown && daylight.isNightLightsOn
            );
            break;
          case DEPTH_PLAYER:
            drawHeroRig(ctx, px, py, player, gameTime);
            break;
          case DEPTH_LOOT:
            this.drawLootDrop(ctx, px, py, lootDrops[a1], gameTime);
            break;
          case DEPTH_CHEST:
            this.drawChest(ctx, px, py, gameTime);
            break;
          case DEPTH_PORTAL:
            this.drawExitPortal(ctx, px, py, gameTime, a1 === 1);
            break;
          case DEPTH_SUMMON:
            drawSummonRig(ctx, px, py, summons[a1], gameTime);
            break;
          case DEPTH_AFTERIMAGE: {
            const p = particles[a1];
            drawHeroRig(
              ctx,
              px,
              py,
              {
                ...player,
                x: p.x,
                y: p.y,
                facingAngle: p.angle ?? player.facingAngle,
                isAttacking: false,
                playerClass: p.playerClass || player.playerClass,
              },
              gameTime,
              { isGhost: true, ghostColor: p.color, ghostAlpha: this.depthAlphaBuf[idx] }
            );
            break;
          }
        }
      }
    }
    flushBatcher();

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
    for (let i = 0; i < projectiles.length; i++) {
      const proj = projectiles[i];
      const pos = this.worldToScreen(proj.x, proj.y, 16, camera);
      this.drawProjectile(ctx, pos.x, pos.y, proj, gameTime);
      this.pushDynamicLight(pos.x, pos.y, proj.school === 1 ? 135 : 95, proj.color, 0.75);
    }

    // 4. Elevated Combat & Spell Particles
    if (this.quality !== 'low') {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (
          p.kind === 'frost_nova' ||
          p.kind === 'scorch' ||
          p.kind === 'shockwave' ||
          p.kind === 'ring' ||
          p.kind === 'afterimage'
        ) {
          continue;
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
        this.lightPool,
        this.lightCount,
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
        const dw = rect.dw ?? rect.sw;
        const dh = rect.dh ?? rect.sh;
        if (useBatcher) {
          this.spriteBatcher.queue(rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, alpha, dw, dh);
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
            dw,
            dh
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
            dw,
            dh
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
              const sprite = atlas.townRoadSprites[h & 7];
              this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);

              // O(1) precomputed overhanging grass-fringe verge overlay
              if (map && townData.edgeMasks && atlas.roadEdgeSprites.length > 0) {
                const edgeMask = townData.edgeMasks[ty * map.width + tx] & 0x0f;
                if (edgeMask !== 0 && atlas.roadEdgeSprites[edgeMask]) {
                  this.queueOrBlitAtlasSprite(
                    ctx,
                    atlas,
                    atlas.roadEdgeSprites[edgeMask],
                    x - 36,
                    y - 20,
                    1.0,
                    true
                  );
                }
              }
            } else if (atlas.townGrassFrames.length > 0) {
              // Fast 4-frame traveling wind wave across the meadow grass (zero per-tile Math.sin!)
              const grassFrame =
                (Math.floor(gameTime * 2.8) + ((tx + ty) & 3)) % atlas.townGrassFrames.length;
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
            const nFrames = atlas.townGrassFrames.length;
            const grassWave =
              gameTime * 5.2 +
              tx * 0.32 +
              ty * 0.21 +
              Math.sin(gameTime * 1.8 - tx * 0.15) * 0.85;
            const grassFrame = ((Math.floor(grassWave) % nFrames) + nFrames) % nFrames;
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
      let shoreMask = 0;
      if (isTown && townData?.edgeMasks && map) {
        shoreMask = townData.edgeMasks[ty * map.width + tx] >>> 4;
      } else if (map) {
        const nWater = map.get(tx, ty - 1) === TileType.Water;
        const eWater = map.get(tx + 1, ty) === TileType.Water;
        const sWater = map.get(tx, ty + 1) === TileType.Water;
        const wWater = map.get(tx - 1, ty) === TileType.Water;
        shoreMask = (nWater ? 0 : 1) | (eWater ? 0 : 2) | (sWater ? 0 : 4) | (wWater ? 0 : 8);
      }
      const isDeep = shoreMask === 0;
      const h = spatialHash(tx, ty, 701);

      if (atlas && atlas.townWaterShallowFrames.length > 0) {
        const frameIdx = (Math.floor(gameTime * 3.8) + ((tx + ty) & 1)) % atlas.townWaterShallowFrames.length;
        const frames = isDeep ? atlas.townWaterDeepFrames[frameIdx] : atlas.townWaterShallowFrames[frameIdx];
        const sprite = frames[h & 3];
        this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 20, 1.0, true);

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
      this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 36, y - 74, alpha, true);
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

        // Shingle course lines & colorful clay tile / mossy thatch accents on front slope (Matching image_98f09f5a.png & image_ca614f3b.png)
        ctx.strokeStyle = palette.shingleLine;
        ctx.lineWidth = 1.1;
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

          // Individual multi-toned terracotta tiles or green moss patches along courses
          const tileSteps = Math.max(4, Math.min(10, Math.floor(rw * 0.9)));
          for (let k = 0; k < tileSteps; k++) {
            const kt = (k + 0.5) / tileSteps;
            const txPt = lx + (rxPt - lx) * kt;
            const tyPt = ly + (ryPt - ly) * kt;
            const hash = ((k * 37 + s * 19 + b.x * 7) & 7);
            if (b.roofStyle === 'rustic_cottage' && hash < 2) {
              // Lush green moss patch on golden thatched roof (image_ca614f3b.png)
              ctx.fillStyle = hash === 0 ? 'rgba(77, 124, 15, 0.72)' : 'rgba(101, 163, 13, 0.65)';
              ctx.beginPath();
              ctx.ellipse(txPt, tyPt, 7, 3.2, -0.2, 0, Math.PI * 2);
              ctx.fill();
            } else if (b.roofStyle === 'terracotta_tudor' && hash < 4) {
              // Colorful terracotta orange, ochre, and slate-green roof shingles (image_98f09f5a.png)
              ctx.fillStyle =
                hash === 0
                  ? 'rgba(234, 88, 12, 0.55)'
                  : hash === 1
                  ? 'rgba(217, 119, 6, 0.52)'
                  : hash === 2
                  ? 'rgba(71, 118, 108, 0.52)'
                  : 'rgba(185, 28, 28, 0.48)';
              ctx.beginPath();
              ctx.arc(txPt, tyPt, 4.2, 0, Math.PI);
              ctx.fill();
            }
          }
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

        // Timber king-post & diagonal Tudor struts on East Gable
        const gMidX = (ne.x + se.x) * 0.5;
        const gMidY = (ne.y + se.y) * 0.5;
        ctx.beginPath();
        ctx.moveTo(rEnd.x, rEnd.y);
        ctx.lineTo(gMidX, gMidY);
        ctx.moveTo((ne.x + gMidX) * 0.5, (ne.y + gMidY) * 0.5);
        ctx.lineTo((rEnd.x + gMidX) * 0.5, (rEnd.y + gMidY) * 0.5);
        ctx.moveTo((se.x + gMidX) * 0.5, (se.y + gMidY) * 0.5);
        ctx.lineTo((rEnd.x + gMidX) * 0.5, (rEnd.y + gMidY) * 0.5);
        ctx.stroke();

        const winX = (rEnd.x + gMidX) * 0.5;
        const winY = (rEnd.y + gMidY) * 0.5;
        ctx.fillStyle = isNight ? '#fbbf24' : '#d97706';
        ctx.fillRect(winX - 4.5, winY - 5, 9, 10);
        ctx.strokeStyle = palette.timber;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(winX - 4.5, winY - 5, 9, 10);
        // Window mullion crossbars
        ctx.beginPath();
        ctx.moveTo(winX, winY - 5);
        ctx.lineTo(winX, winY + 5);
        ctx.moveTo(winX - 4.5, winY);
        ctx.lineTo(winX + 4.5, winY);
        ctx.stroke();

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

    // Authentic Projecting Timber & Wrought-Iron Hanging Shop Signboard (Matching image.png)
    const bracketX = doorScreen.x + 24;
    const bracketY = roofAlpha < 0.5 ? doorScreen.y + 6 : doorScreen.y - 18;
    const signSwing = Math.sin(gameTime * 2.1 + b.x * 0.5) * 1.2;

    if (roofAlpha >= 0.25) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.98, roofAlpha + 0.15);

      // 1. Wall mounting plate & horizontal timber/iron support beam
      ctx.fillStyle = '#27272a';
      ctx.fillRect(bracketX - 18, bracketY - 6, 3.5, 13);
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#1c0a00';
      ctx.lineWidth = 1;
      ctx.fillRect(bracketX - 16, bracketY - 4, 24, 3.5);
      ctx.strokeRect(bracketX - 16, bracketY - 4, 24, 3.5);

      // Diagonal timber/iron brace strut & decorative wrought-iron scroll curl
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bracketX - 15, bracketY + 5);
      ctx.lineTo(bracketX - 4, bracketY - 3);
      ctx.stroke();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bracketX + 6, bracketY - 5.5, 2.5, 0, Math.PI * 1.5);
      ctx.stroke();

      // 2. Twin iron suspension rings/chains
      const plaqueX = bracketX - 4 + signSwing * 0.5;
      const plaqueY = bracketY + 1;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(bracketX - 10, bracketY - 0.5);
      ctx.lineTo(plaqueX - 6, plaqueY + 1);
      ctx.moveTo(bracketX + 2, bracketY - 0.5);
      ctx.lineTo(plaqueX + 6, plaqueY + 1);
      ctx.stroke();

      // 3. Framed Honey-Oak Hanging Plaque Board with Bevelled Trim
      ctx.fillStyle = 'rgba(10, 15, 28, 0.38)';
      ctx.fillRect(plaqueX - 11, plaqueY + 2, 22, 16);

      ctx.fillStyle = '#5c2d0c';
      ctx.strokeStyle = '#2a1204';
      ctx.lineWidth = 1.3;
      ctx.fillRect(plaqueX - 11, plaqueY, 22, 15);
      ctx.strokeRect(plaqueX - 11, plaqueY, 22, 15);

      // Inner warm honey-oak recessed panel
      ctx.fillStyle = '#9a521c';
      ctx.fillRect(plaqueX - 9, plaqueY + 2, 18, 11);
      ctx.fillStyle = '#c2712d';
      ctx.fillRect(plaqueX - 9, plaqueY + 2, 18, 2);

      // Brass corner rivets
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(plaqueX - 10, plaqueY + 1, 1.5, 1.5);
      ctx.fillRect(plaqueX + 8.5, plaqueY + 1, 1.5, 1.5);
      ctx.fillRect(plaqueX - 10, plaqueY + 12.5, 1.5, 1.5);
      ctx.fillRect(plaqueX + 8.5, plaqueY + 12.5, 1.5, 1.5);

      // Painted golden emblem inside the hanging shop signboard
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      if (b.id.includes('inn')) {
        // Golden Tankard / Shield
        ctx.roundRect(plaqueX - 3.5, plaqueY + 4, 6, 7, 1.5);
      } else if (b.id.includes('blacksmith')) {
        // Anvil / Hammer silhouette
        ctx.moveTo(plaqueX - 5, plaqueY + 5);
        ctx.lineTo(plaqueX + 5, plaqueY + 5);
        ctx.lineTo(plaqueX + 3, plaqueY + 10);
        ctx.lineTo(plaqueX - 3, plaqueY + 10);
        ctx.closePath();
      } else if (b.id.includes('merchant')) {
        // Round Potion Flask
        ctx.arc(plaqueX, plaqueY + 8.2, 3.6, 0, Math.PI * 2);
      } else {
        // Heraldic Diamond Crest
        ctx.moveTo(plaqueX, plaqueY + 3.5);
        ctx.lineTo(plaqueX + 4.5, plaqueY + 7.5);
        ctx.lineTo(plaqueX, plaqueY + 11.5);
        ctx.lineTo(plaqueX - 4.5, plaqueY + 7.5);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Crisp Carved Oak Building Nameplate Plaque Above Doorway (Always readable, gently rises when inside)
    ctx.globalAlpha = 0.96;
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    const labelW = ctx.measureText(b.name).width + 20;
    const signY = roofAlpha < 0.5 ? doorScreen.y + 18 : doorScreen.y - 8;

    // Outer dark oak & wrought-iron border
    ctx.fillStyle = '#3b1a06';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.fillRect(doorScreen.x - labelW / 2 - 1, signY - 15, labelW + 2, 19);
    ctx.strokeRect(doorScreen.x - labelW / 2 - 1, signY - 15, labelW + 2, 19);

    // Warm carved honey-oak plaque body with sunlit top bevel
    const signGrad = ctx.createLinearGradient(0, signY - 14, 0, signY + 3);
    signGrad.addColorStop(0, '#7c3f14');
    signGrad.addColorStop(0.5, '#5c2d0c');
    signGrad.addColorStop(1, '#3d1b06');
    ctx.fillStyle = signGrad;
    ctx.fillRect(doorScreen.x - labelW / 2, signY - 14, labelW, 17);

    ctx.strokeStyle = '#d48238';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(doorScreen.x - labelW / 2 + 0.5, signY - 13.5, labelW - 1, 16);

    // Brass mounting studs on left & right ends of nameplate
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(doorScreen.x - labelW / 2 + 4, signY - 5.5, 1.3, 0, Math.PI * 2);
    ctx.arc(doorScreen.x + labelW / 2 - 4, signY - 5.5, 1.3, 0, Math.PI * 2);
    ctx.fill();

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
    gameTime: number = 0,
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

    if (atlas && atlas.townTreeFrames.length > 0) {
      const nFrames = atlas.townTreeFrames.length;
      const variantIdx = species + ((h & 1) === 0 ? 0 : 4);
      const treeFrame = (Math.floor(gameTime * 2.8) + ((tx * 3 + ty * 5) & 3)) % nFrames;
      const sprite = atlas.townTreeFrames[treeFrame][variantIdx];
      this.queueOrBlitAtlasSprite(ctx, atlas, sprite, x - 48, y - 92, alpha, true);
      return;
    }

    const phase = gameTime * 2.35 - tx * 0.38 - ty * 0.24 + (h & 31) * 0.25;
    const windShear = Math.sin(phase) * 0.04;
    const canopyLift = Math.cos(phase * 1.9) * 0.012;

    // Lightweight vector fallback for headless tests without offscreen canvas
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.transform(1, canopyLift, windShear, 1, 0, 0);
    ctx.fillStyle = '#5c381c';
    ctx.fillRect(-4, -24, 8, 26);
    ctx.fillStyle = species === 0 ? '#2f7a18' : species === 1 ? '#3b8f22' : '#4ea826';
    ctx.beginPath();
    ctx.arc(0, -34, 18, 0, Math.PI * 2);
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
      // Ornate Medieval Wrought-Iron Lamp Post with Stepped Stone Pedestal,
      // Hanging Wooden Directional Signboards & Glowing Amber Glass Lantern (Matching image.png)
      const sway = Math.sin(gameTime * 2.2 + x * 0.03 + y * 0.02) * 0.6;

      // 1. Ground Shadow Ellipse
      ctx.fillStyle = 'rgba(10, 15, 28, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x + 2, y + 3, 14, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Stepped Chiseled Stone Plinth & Pedestal Base
      // Lower wider stone step (3D isometric block)
      ctx.fillStyle = '#475061';
      ctx.strokeStyle = '#252a34';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 1);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x + 9, y + 1);
      ctx.lineTo(x + 9, y - 3);
      ctx.lineTo(x, y - 7);
      ctx.lineTo(x - 9, y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sunlit top bevel of lower plinth step
      ctx.fillStyle = '#7c8699';
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 3);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + 9, y - 3);
      ctx.lineTo(x, y - 7);
      ctx.closePath();
      ctx.fill();

      // Upper tapered stone pedestal block (Left lit face, Right shaded face, Top cap)
      ctx.fillStyle = '#687285';
      ctx.beginPath();
      ctx.moveTo(x - 6.5, y - 3);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - 11);
      ctx.lineTo(x - 6.5, y - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4b5363';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6.5, y - 3);
      ctx.lineTo(x + 6.5, y - 14);
      ctx.lineTo(x, y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pedestal top stone cap
      ctx.fillStyle = '#949fb3';
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 14);
      ctx.lineTo(x, y - 11);
      ctx.lineTo(x + 7, y - 14);
      ctx.lineTo(x, y - 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lush green moss tufts & tiny yellow flower around the stone pedestal base
      ctx.fillStyle = '#2f6e1e';
      ctx.beginPath();
      ctx.arc(x - 7, y + 2, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 2.5, 2.8, 0, Math.PI * 2);
      ctx.arc(x - 2, y + 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(x - 7.3, y + 1.2, 2.0, 0, Math.PI * 2);
      ctx.arc(x + 5.7, y + 1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x - 6.5, y + 1.2, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // 3. Tall Dark Wrought-Iron Lamp Post Shaft with Decorative Collar Rings & Finial Spire
      // Cast-iron base boot collar
      ctx.fillStyle = '#1e2530';
      ctx.strokeStyle = '#0f141c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y - 14, 3.6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Main vertical iron pillar (y - 14 up to y - 66)
      ctx.fillStyle = '#1e2530';
      ctx.fillRect(x - 2.2, y - 66, 4.4, 52);
      // Metallic left-edge highlight along the iron post
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 1.8, y - 65, 1.2, 50);

      // Decorative wrought-iron molded node rings along the shaft
      const collarYs = [y - 24, y - 47, y - 57];
      for (const cy of collarYs) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.9;
        ctx.fillRect(x - 3.2, cy - 1.2, 6.4, 2.4);
        ctx.strokeRect(x - 3.2, cy - 1.2, 6.4, 2.4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 2.6, cy - 0.8, 2.0, 1.2);
      }

      // Top pointed wrought-iron finial spire
      ctx.fillStyle = '#1e2530';
      ctx.beginPath();
      ctx.moveTo(x - 2.8, y - 66);
      ctx.lineTo(x, y - 73);
      ctx.lineTo(x + 2.8, y - 66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(x, y - 66.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 4. Hanging Wooden Directional Signboards Mounted on the Post (Matching image.png)
      // Left Signboard (pointing West/North-West at y - 40)
      {
        const barY = y - 43;
        // Horizontal iron sign bracket bar extending left
        ctx.strokeStyle = '#1e2530';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(x - 2, barY);
        ctx.lineTo(x - 21, barY);
        ctx.stroke();
        // Small iron end-curl
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x - 21, barY - 1.8, 1.8, 0, Math.PI * 1.5);
        ctx.stroke();

        // Twin iron hanging rings
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 6, barY);
        ctx.lineTo(x - 6, barY + 3);
        ctx.moveTo(x - 16, barY);
        ctx.lineTo(x - 16, barY + 3);
        ctx.stroke();

        // Pointed carved honey-oak signboard plaque
        const sy = barY + 2.5;
        ctx.fillStyle = '#8c4a19';
        ctx.strokeStyle = '#3b1905';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x - 3, sy);
        ctx.lineTo(x - 18.5, sy);
        ctx.lineTo(x - 22.5, sy + 4.2);
        ctx.lineTo(x - 18.5, sy + 8.4);
        ctx.lineTo(x - 3, sy + 8.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sunlit top wood bevel & carved inscription lines
        ctx.strokeStyle = '#df8b3e';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x - 3.5, sy + 1.1);
        ctx.lineTo(x - 18.2, sy + 1.1);
        ctx.stroke();

        ctx.strokeStyle = '#451e06';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x - 5.5, sy + 3.6);
        ctx.lineTo(x - 16.5, sy + 3.6);
        ctx.moveTo(x - 5.5, sy + 5.8);
        ctx.lineTo(x - 14.0, sy + 5.8);
        ctx.stroke();
      }

      // Right Signboard (pointing East/South-East at y - 34)
      {
        const barY = y - 36;
        // Horizontal iron sign bracket bar extending right
        ctx.strokeStyle = '#1e2530';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(x + 2, barY);
        ctx.lineTo(x + 20, barY);
        ctx.stroke();

        // Twin iron hanging rings
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 6, barY);
        ctx.lineTo(x + 6, barY + 3);
        ctx.moveTo(x + 15, barY);
        ctx.lineTo(x + 15, barY + 3);
        ctx.stroke();

        // Carved honey-oak signboard plaque pointing right
        const sy = barY + 2.5;
        ctx.fillStyle = '#9e561e';
        ctx.strokeStyle = '#3b1905';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x + 3, sy);
        ctx.lineTo(x + 17.5, sy);
        ctx.lineTo(x + 21.5, sy + 4.0);
        ctx.lineTo(x + 17.5, sy + 8.0);
        ctx.lineTo(x + 3, sy + 8.0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sunlit top wood bevel & carved inscription lines
        ctx.strokeStyle = '#eab364';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x + 3.5, sy + 1.1);
        ctx.lineTo(x + 17.2, sy + 1.1);
        ctx.stroke();

        ctx.strokeStyle = '#451e06';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x + 5.5, sy + 3.5);
        ctx.lineTo(x + 15.8, sy + 3.5);
        ctx.moveTo(x + 5.5, sy + 5.6);
        ctx.lineTo(x + 13.5, sy + 5.6);
        ctx.stroke();
      }

      // 5. Ornate Wrought-Iron S-Scroll Cross-Arm at Top of Post (y - 62)
      ctx.strokeStyle = '#1e2530';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 60);
      ctx.quadraticCurveTo(x - 3, y - 64, x, y - 62);
      ctx.quadraticCurveTo(x + 7, y - 66, x + 15, y - 61);
      ctx.stroke();

      // Metallic highlight on top of cross-arm
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 62.8);
      ctx.quadraticCurveTo(x + 7, y - 66.5, x + 14.5, y - 61.6);
      ctx.stroke();

      // Decorative wrought-iron volute curls under & above the bracket arm
      ctx.strokeStyle = '#263040';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      // Under-arm support scroll
      ctx.moveTo(x + 2, y - 55);
      ctx.quadraticCurveTo(x + 6, y - 55, x + 8, y - 61);
      // Spiral curl
      ctx.arc(x + 5.2, y - 57.5, 2.2, 0, Math.PI * 1.6);
      ctx.stroke();

      // Left counterbalance curl
      ctx.beginPath();
      ctx.arc(x - 5.5, y - 58.2, 2.0, 0, Math.PI * 1.5);
      ctx.stroke();

      // 6. Hanging Hexagonal Tapered Warm Amber Glass Lantern (at x + 15, y - 52)
      const lx = x + 15 + sway;
      const ly = y - 53;

      // Short suspension chain link
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + 15, y - 61);
      ctx.lineTo(lx, ly - 5);
      ctx.stroke();

      // Warm golden radial halo around the lantern (brighter at night, warm daytime sheen too)
      const haloRadius = isNight ? 24 : 13;
      const haloGrad = ctx.createRadialGradient(lx, ly + 1, 1.5, lx, ly + 1, haloRadius);
      haloGrad.addColorStop(0, isNight ? 'rgba(254, 240, 138, 0.75)' : 'rgba(251, 191, 36, 0.38)');
      haloGrad.addColorStop(0.45, isNight ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.14)');
      haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(lx, ly + 1, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Tiered dark iron lantern hood cap
      ctx.fillStyle = '#1e2530';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(lx - 6.5, ly - 2);
      ctx.lineTo(lx - 2.5, ly - 5.5);
      ctx.lineTo(lx + 2.5, ly - 5.5);
      ctx.lineTo(lx + 6.5, ly - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing tapered hexagonal glass cage (Warm orange outer -> golden yellow -> white-gold core)
      const glassGrad = ctx.createRadialGradient(lx, ly + 2, 0.8, lx, ly + 2, 6.5);
      glassGrad.addColorStop(0, '#fef9c3');
      glassGrad.addColorStop(0.45, '#fde047');
      glassGrad.addColorStop(0.8, '#f59e0b');
      glassGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(lx - 5.2, ly - 2);
      ctx.lineTo(lx + 5.2, ly - 2);
      ctx.lineTo(lx + 3.8, ly + 7);
      ctx.lineTo(lx - 3.8, ly + 7);
      ctx.closePath();
      ctx.fill();

      // Wrought-iron lantern cage muntin bars & bottom finial drop
      ctx.strokeStyle = '#1e2530';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(lx - 5.2, ly - 2);
      ctx.lineTo(lx + 5.2, ly - 2);
      ctx.lineTo(lx + 3.8, ly + 7);
      ctx.lineTo(lx - 3.8, ly + 7);
      ctx.closePath();
      // Center vertical & diagonal cage bars
      ctx.moveTo(lx, ly - 2);
      ctx.lineTo(lx, ly + 7);
      ctx.stroke();

      // Bottom iron base cap & finial spike
      ctx.fillStyle = '#1e2530';
      ctx.beginPath();
      ctx.moveTo(lx - 4.2, ly + 7);
      ctx.lineTo(lx + 4.2, ly + 7);
      ctx.lineTo(lx, ly + 10.5);
      ctx.closePath();
      ctx.fill();
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
      // Detailed 3D Isometric Carved Golden-Oak & Wrought-Iron Scrollwork Park Bench
      // with Lush Green Grass & Wildflower Tuft at Base (Matching image.png)
      // Isometric bench axis: runs along the South-West to North-East diagonal
      // 1. Soft elongated isometric ground shadow underneath bench
      ctx.fillStyle = 'rgba(10, 15, 28, 0.46)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 2.5, 23, 9, -0.26, 0, Math.PI * 2);
      ctx.fill();

      // 2. Back-side grass tuft behind the rear right leg
      ctx.fillStyle = '#2d6a1e';
      ctx.beginPath();
      ctx.arc(x + 15, y - 10, 3.8, 0, Math.PI * 2);
      ctx.arc(x + 18, y - 9, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(x + 15.5, y - 11, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Rear & Front Cast Wrought-Iron Frame Legs & Under-Seat Stretcher Arch
      ctx.fillStyle = '#1e2530';
      ctx.strokeStyle = '#0f141c';
      ctx.lineWidth = 1.2;

      // Back-left iron leg & backrest upright stile
      ctx.fillRect(x - 16.5, y - 22, 3.4, 23);
      ctx.strokeRect(x - 16.5, y - 22, 3.4, 23);
      // Back-right iron leg & backrest upright stile
      ctx.fillRect(x + 9.5, y - 29, 3.4, 23);
      ctx.strokeRect(x + 9.5, y - 29, 3.4, 23);

      // Under-seat wrought-iron cross-brace stretcher & curved side supports
      ctx.strokeStyle = '#263040';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 3);
      ctx.lineTo(x + 13, y - 10);
      // Left side iron arch brace between front & back leg
      ctx.moveTo(x - 15, y - 4);
      ctx.quadraticCurveTo(x - 12.5, y - 7, x - 10, y - 1);
      // Right side iron arch brace between front & back leg
      ctx.moveTo(x + 11, y - 11);
      ctx.quadraticCurveTo(x + 13.5, y - 14, x + 15.5, y - 8);
      ctx.stroke();

      // 4. Angled Slatted Golden-Oak Backrest (3 Distinct Horizontal Oak Planks with Wood Grain & Bolts)
      // Backrest rises from (-15.5, -10.5) -> (-16.5, -22) on left, and (+10.5, -17.5) -> (+9.5, -29) on right
      // Dark oak rear frame backing
      ctx.fillStyle = '#3b1905';
      ctx.beginPath();
      ctx.moveTo(x - 16.2, y - 10.5);
      ctx.lineTo(x + 11.2, y - 17.5);
      ctx.lineTo(x + 10.2, y - 28.5);
      ctx.lineTo(x - 17.0, y - 21.5);
      ctx.closePath();
      ctx.fill();

      // Center vertical iron/oak reinforcement strap behind slats
      ctx.fillStyle = '#263040';
      ctx.beginPath();
      ctx.moveTo(x - 3.5, y - 13.5);
      ctx.lineTo(x - 1.5, y - 14.0);
      ctx.lineTo(x - 2.3, y - 25.2);
      ctx.lineTo(x - 4.3, y - 24.7);
      ctx.closePath();
      ctx.fill();

      const backSlats = [
        { y0: -11.0, y1: -14.2, fill: '#9a521c', hi: '#c87632', border: '#3b1905' },
        { y0: -14.8, y1: -18.0, fill: '#b06124', hi: '#df8b3e', border: '#3b1905' },
        { y0: -18.6, y1: -22.0, fill: '#c4712c', hi: '#f3ac5c', border: '#3b1905' },
      ];
      for (const bs of backSlats) {
        ctx.fillStyle = bs.fill;
        ctx.strokeStyle = bs.border;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x - 15.5, y + bs.y0);
        ctx.lineTo(x + 10.8, y + bs.y0 - 7.0);
        ctx.lineTo(x + 10.3, y + bs.y1 - 7.0);
        ctx.lineTo(x - 16.0, y + bs.y1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Warm sunlit top edge highlight along each oak plank
        ctx.strokeStyle = bs.hi;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(x - 15.4, y + bs.y1 + 0.6);
        ctx.lineTo(x + 9.8, y + bs.y1 - 6.4);
        ctx.stroke();

        // Subtle wood-grain joint notch
        ctx.strokeStyle = 'rgba(59, 25, 5, 0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - 3.0, y + bs.y0 - 3.3);
        ctx.lineTo(x - 3.3, y + bs.y1 - 3.3);
        ctx.stroke();
      }

      // Wrought-iron side stiles & rounded top finials flanking the backrest
      ctx.fillStyle = '#1e2530';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(x - 15.2, y - 22.2, 2.0, 0, Math.PI * 2);
      ctx.arc(x + 10.8, y - 29.2, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Brass/iron bolt studs on the backrest planks
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x - 14.5, y - 19.8, 0.95, 0, Math.PI * 2);
      ctx.arc(x - 14.2, y - 16.0, 0.95, 0, Math.PI * 2);
      ctx.arc(x + 9.5, y - 26.8, 0.95, 0, Math.PI * 2);
      ctx.arc(x + 9.8, y - 23.0, 0.95, 0, Math.PI * 2);
      ctx.fill();

      // 5. 3D Slatted Golden-Oak Seat Deck (3 Planks + Bevelled Front Apron)
      // Dark oak under-frame & 3D front-edge thickness
      ctx.fillStyle = '#3b1905';
      ctx.beginPath();
      ctx.moveTo(x - 15.5, y - 10.2);
      ctx.lineTo(x + 11.0, y - 17.2);
      ctx.lineTo(x + 17.8, y - 12.8);
      ctx.lineTo(x + 17.8, y - 10.0);
      ctx.lineTo(x - 8.8, y - 3.0);
      ctx.lineTo(x - 15.5, y - 7.4);
      ctx.closePath();
      ctx.fill();

      // Three Individual Isometric Golden-Oak Seat Planks
      const seatSlats = [
        { t0: 0.0, t1: 0.31, fill: '#9a521c', hi: '#c87632' },
        { t0: 0.34, t1: 0.65, fill: '#b06124', hi: '#df8b3e' },
        { t0: 0.68, t1: 1.0, fill: '#c4712c', hi: '#f3ac5c' },
      ];
      for (const sl of seatSlats) {
        const blX = -15.2 + 6.6 * sl.t0;
        const blY = -10.2 + 4.4 * sl.t0;
        const brX = 11.0 + 6.6 * sl.t0;
        const brY = -17.2 + 4.4 * sl.t0;
        const frX = 11.0 + 6.6 * sl.t1;
        const frY = -17.2 + 4.4 * sl.t1;
        const flX = -15.2 + 6.6 * sl.t1;
        const flY = -10.2 + 4.4 * sl.t1;

        ctx.fillStyle = sl.fill;
        ctx.beginPath();
        ctx.moveTo(x + blX, y + blY);
        ctx.lineTo(x + brX, y + brY);
        ctx.lineTo(x + frX, y + frY);
        ctx.lineTo(x + flX, y + flY);
        ctx.closePath();
        ctx.fill();

        // Crisp sunlit front-top wood grain highlight on each plank
        ctx.strokeStyle = sl.hi;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(x + flX + 0.5, y + flY - 0.3);
        ctx.lineTo(x + frX - 0.5, y + frY - 0.3);
        ctx.stroke();
      }

      // Warm amber front lip bevel on the foremost seat plank
      ctx.fillStyle = '#8c4a19';
      ctx.beginPath();
      ctx.moveTo(x - 8.6, y - 5.8);
      ctx.lineTo(x + 17.6, y - 12.8);
      ctx.lineTo(x + 17.6, y - 10.6);
      ctx.lineTo(x - 8.6, y - 3.6);
      ctx.closePath();
      ctx.fill();

      // 6. Front Cast Wrought-Iron Legs & Ornate S-Scroll Volute Armrests
      // Front-left leg with flared foot
      ctx.fillStyle = '#1e2530';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.0;
      ctx.fillRect(x - 10.8, y - 6.5, 3.4, 11.2);
      ctx.strokeRect(x - 10.8, y - 6.5, 3.4, 11.2);
      // Front-right leg with flared foot
      ctx.fillRect(x + 14.5, y - 13.5, 3.4, 11.2);
      ctx.strokeRect(x + 14.5, y - 13.5, 3.4, 11.2);

      // Ornate Curved Wrought-Iron Scrollwork Armrests on Left and Right Ends
      ctx.strokeStyle = '#1e2530';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Left armrest S-scroll with front spiral volute
      ctx.moveTo(x - 15.2, y - 16.5);
      ctx.bezierCurveTo(x - 11.5, y - 15.5, x - 8.2, y - 13.0, x - 9.2, y - 6.5);
      // Right armrest S-scroll with front spiral volute
      ctx.moveTo(x + 10.8, y - 23.5);
      ctx.bezierCurveTo(x + 14.5, y - 22.5, x + 17.8, y - 20.0, x + 16.2, y - 13.5);
      ctx.stroke();

      // Specular metallic highlight on top of iron armrests & spiral curls
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x - 15.0, y - 17.2);
      ctx.quadraticCurveTo(x - 10.2, y - 15.2, x - 9.0, y - 10.8);
      ctx.arc(x - 10.2, y - 10.5, 1.8, 0, Math.PI * 1.4);
      ctx.moveTo(x + 11.0, y - 24.2);
      ctx.quadraticCurveTo(x + 15.8, y - 22.2, x + 16.6, y - 17.8);
      ctx.stroke();

      // 7. Foreground Green Grass Tuft & Golden-Yellow Wildflowers at Front-Left Bench Foot (Matching image.png)
      ctx.fillStyle = '#2d6a1e';
      ctx.beginPath();
      ctx.arc(x - 12.5, y + 4.2, 4.2, 0, Math.PI * 2);
      ctx.arc(x - 8.5, y + 5.0, 3.5, 0, Math.PI * 2);
      ctx.arc(x - 15.5, y + 3.2, 3.0, 0, Math.PI * 2);
      ctx.fill();

      // Crisp upward grass blades at base
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 4);
      ctx.lineTo(x - 16, y - 1);
      ctx.moveTo(x - 12, y + 5);
      ctx.lineTo(x - 12, y - 1.5);
      ctx.moveTo(x - 9.5, y + 5);
      ctx.lineTo(x - 7.5, y);
      ctx.stroke();

      // Tiny blooming golden-yellow wildflowers on the bench base tuft
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x - 13.5, y + 2.2, 1.4, 0, Math.PI * 2);
      ctx.arc(x - 9.2, y + 3.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - 13.5, y + 2.0, 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'bush') {
      // Lush Leafy Shrubs, Pink-Blossoming Hydrangea Bushes & Wildflower Tufts (Matching image.png)
      const v = (prop.variant ?? 0) % 3;
      const sway = Math.sin(gameTime * 2.6 + x * 0.04 + y * 0.03) * 1.1;

      const drawBushCluster = (bx: number, by: number, rx: number, ry: number, hasPinkFlowers: boolean, hasYellowFlowers: boolean) => {
        // 1. Deep forest-green scalloped base lobes & dark outline
        const lobes = 8;
        ctx.beginPath();
        for (let i = 0; i < lobes; i++) {
          const a = (i / lobes) * Math.PI * 2;
          const lx = bx + sway * 0.5 + Math.cos(a) * rx * 0.65;
          const ly = by + Math.sin(a) * ry * 0.65;
          const lr = (i % 2 === 0 ? 0.48 : 0.40) * Math.min(rx, ry * 1.3);
          ctx.moveTo(lx + lr, ly);
          ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        }
        ctx.moveTo(bx + rx * 0.72, by);
        ctx.ellipse(bx + sway * 0.5, by, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1b5211';
        ctx.fill();
        ctx.strokeStyle = '#0d2b07';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // 2. Vibrant mid-emerald leafy body
        ctx.fillStyle = '#439c23';
        ctx.beginPath();
        for (let i = 0; i < lobes; i++) {
          const a = (i / lobes) * Math.PI * 2;
          if (Math.sin(a) > 0.6) continue;
          const lx = bx + sway * 0.7 - 0.5 + Math.cos(a) * rx * 0.58;
          const ly = by - 1.4 + Math.sin(a) * ry * 0.58;
          const lr = (i % 2 === 0 ? 0.44 : 0.36) * Math.min(rx, ry * 1.25);
          ctx.moveTo(lx + lr, ly);
          ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        }
        ctx.ellipse(bx + sway * 0.7 - 0.4, by - 1.4, rx * 0.62, ry * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Sunlit lime-green crown puffs
        ctx.fillStyle = '#8ce03a';
        ctx.beginPath();
        ctx.arc(bx + sway - rx * 0.26, by - ry * 0.38, rx * 0.28, 0, Math.PI * 2);
        ctx.arc(bx + sway + rx * 0.12, by - ry * 0.44, rx * 0.25, 0, Math.PI * 2);
        ctx.arc(bx + sway - rx * 0.44, by - ry * 0.12, rx * 0.20, 0, Math.PI * 2);
        ctx.fill();

        // 4. Blossoms (Magenta-Pink Hydrangea/Rose clusters OR Yellow-Gold Florets as in image.png)
        if (hasPinkFlowers) {
          const pinkSpots = [
            { ox: -0.45, oy: -0.25, r: 2.3 },
            { ox: 0.05, oy: -0.52, r: 2.5 },
            { ox: 0.48, oy: -0.22, r: 2.2 },
            { ox: -0.22, oy: 0.18, r: 2.4 },
            { ox: 0.28, oy: 0.15, r: 2.3 },
            { ox: -0.58, oy: 0.12, r: 1.9 },
          ];
          for (const sp of pinkSpots) {
            const fx = bx + sway * 0.8 + sp.ox * rx;
            const fy = by - 1 + sp.oy * ry;
            ctx.fillStyle = '#db2777';
            ctx.beginPath();
            ctx.arc(fx, fy, sp.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(fx - 0.4, fy - 0.4, sp.r * 0.72, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbcfe8';
            ctx.beginPath();
            ctx.arc(fx - 0.6, fy - 0.6, sp.r * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (hasYellowFlowers) {
          const yellowSpots = [
            { ox: -0.38, oy: -0.32, r: 1.7 },
            { ox: 0.18, oy: -0.45, r: 1.8 },
            { ox: 0.45, oy: -0.1, r: 1.6 },
            { ox: -0.15, oy: 0.15, r: 1.8 },
            { ox: 0.25, oy: 0.22, r: 1.6 },
          ];
          for (const sp of yellowSpots) {
            const fx = bx + sway * 0.8 + sp.ox * rx;
            const fy = by - 1 + sp.oy * ry;
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(fx, fy, sp.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(fx - 0.3, fy - 0.3, sp.r * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      if (v === 0) {
        // Variant 0: Rounded Green Bush with Yellow-Gold Florets (bottom-left bush in image.png)
        drawBushCluster(x, y - 9, 15.5, 11.5, false, true);
      } else if (v === 1) {
        // Variant 1: Lush Pink-Blossoming Hydrangea / Rose Shrub (middle bush in image.png)
        drawBushCluster(x, y - 10, 17, 12.5, true, false);
      } else {
        // Variant 2: Compact Leafy Bush + Blooming 3-Flower Plant & Crisp 5-Blade Grass Tuft (image.png)
        drawBushCluster(x - 7, y - 8, 12.5, 9.5, false, true);

        // Blooming 3-flower wildflower clump on the right
        const fx = x + 9;
        const fy = y - 2;
        ctx.fillStyle = '#1b5211';
        ctx.beginPath();
        ctx.ellipse(fx, fy + 1.5, 6.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Broad green basal leaves
        ctx.fillStyle = '#48a126';
        ctx.beginPath();
        ctx.ellipse(fx - 3.5, fy, 3.8, 1.6, -0.35, 0, Math.PI * 2);
        ctx.ellipse(fx + 3.5, fy, 3.8, 1.6, 0.35, 0, Math.PI * 2);
        ctx.ellipse(fx, fy - 1, 3.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();

        const flowers = [
          { ox: -3.5, oy: -7.5, col: '#fb923c', core: '#fef08a' },
          { ox: 0.5, oy: -9.5, col: '#facc15', core: '#b45309' },
          { ox: 4.0, oy: -6.8, col: '#f472b6', core: '#fef08a' },
        ];
        ctx.strokeStyle = '#256e18';
        ctx.lineWidth = 1.3;
        for (const fl of flowers) {
          const bx = fx + fl.ox + sway * 0.6;
          const by = fy + fl.oy;
          ctx.beginPath();
          ctx.moveTo(fx + fl.ox * 0.3, fy);
          ctx.lineTo(bx, by);
          ctx.stroke();

          ctx.fillStyle = fl.col;
          ctx.beginPath();
          ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fl.core;
          ctx.beginPath();
          ctx.arc(bx, by, 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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
      // Coopered Honey-Oak Barrel with Dual Wrought-Iron Hoops & Rivets (Matching image.png)
      ctx.fillStyle = 'rgba(10, 15, 28, 0.42)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 1.5, 9.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      const bGrad = ctx.createLinearGradient(x - 9, y - 18, x + 9, y);
      bGrad.addColorStop(0, '#c2712d');
      bGrad.addColorStop(0.45, '#9a521c');
      bGrad.addColorStop(1, '#5c2d0c');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(x, y - 9, 8.8, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a1204';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Vertical stave seam lines
      ctx.strokeStyle = 'rgba(42, 18, 4, 0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 16);
      ctx.lineTo(x - 4.5, y - 1);
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x, y);
      ctx.moveTo(x + 4, y - 16);
      ctx.lineTo(x + 4.5, y - 1);
      ctx.stroke();

      // Dual wrought-iron barrel hoops with metallic highlight & rivets
      ctx.strokeStyle = '#272f3d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(x, y - 13, 8.4, 3.0, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y - 5.5, 8.4, 3.0, 0, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y - 13.4, 8.2, 2.8, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Top recessed oak lid & bung cork
      ctx.fillStyle = '#8c4a19';
      ctx.strokeStyle = '#3b1905';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(x, y - 17.2, 7.0, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(x + 2, y - 17.2, 1.4, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'crate') {
      // 3D Isometric Framed Honey-Oak Crate with Diagonal Cross-Braces & Iron Studs (Matching image.png)
      // Ground shadow
      ctx.fillStyle = 'rgba(10, 15, 28, 0.44)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 2, 12.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left Lit Face (x - 10..x, y - 14..y + 1)
      ctx.fillStyle = '#a85d22';
      ctx.strokeStyle = '#3b1905';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 4);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x - 10, y - 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Face Diagonal Cross-Brace Plank
      ctx.strokeStyle = '#c87632';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x - 8.5, y - 15);
      ctx.lineTo(x - 1.5, y - 1);
      ctx.stroke();
      ctx.strokeStyle = '#6b3610';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(x - 8.8, y - 15.2, 7.4, 12.5);

      // Right Shaded Face (x..x + 10, y + 1..y - 17)
      ctx.fillStyle = '#7c3f14';
      ctx.strokeStyle = '#3b1905';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + 10, y - 4);
      ctx.lineTo(x + 10, y - 17);
      ctx.lineTo(x, y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Face Diagonal Cross-Brace Plank
      ctx.strokeStyle = '#9a521c';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x + 1.5, y - 10.5);
      ctx.lineTo(x + 8.5, y - 5.5);
      ctx.stroke();

      // Top Sunlit Isometric Lid (Diamond at y - 12..y - 22)
      ctx.fillStyle = '#c87632';
      ctx.strokeStyle = '#3b1905';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 17);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x + 10, y - 17);
      ctx.lineTo(x, y - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top lid plank lines & sunlit rim highlight
      ctx.strokeStyle = '#eab364';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x - 8.5, y - 17);
      ctx.lineTo(x, y - 21);
      ctx.lineTo(x + 8.5, y - 17);
      ctx.stroke();

      // Dark iron corner bolt rivets
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 9.2, y - 16.2, 1.4, 1.4);
      ctx.fillRect(x - 1.4, y - 12.2, 1.4, 1.4);
      ctx.fillRect(x - 1.4, y - 1.2, 1.4, 1.4);
      ctx.fillRect(x + 7.8, y - 16.2, 1.4, 1.4);
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
      const clothWave = Math.sin(gameTime * 3.8 + x * 0.05) * 2.2;
      const tipWhip = Math.sin(gameTime * 6.4 + x * 0.08 - 0.9) * 1.4;
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
      ctx.quadraticCurveTo(x + 6 + clothWave * 0.6, y - 26, x + 6 + clothWave + tipWhip, y - 14);
      ctx.lineTo(x + 2 + clothWave + tipWhip * 0.8, y - 19);
      ctx.lineTo(x + clothWave + tipWhip, y - 12);
      ctx.lineTo(x - 3 + clothWave + tipWhip * 0.8, y - 18);
      ctx.lineTo(x - 6 + clothWave + tipWhip, y - 13);
      ctx.quadraticCurveTo(x - 6 + clothWave * 0.6, y - 26, x - 6, y - 38);
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
      const frameIdx = Math.floor(gameTime * 4.5) % atlas.fountainFrames.length;
      this.queueOrBlitAtlasSprite(
        ctx,
        atlas,
        atlas.fountainFrames[frameIdx],
        x - 74,
        y - 92,
        1.0,
        true
      );
      return;
    }

    ctx.save();
    const phase = gameTime * 4.5;

    // 1. Ground Shadow & Stepped Outer Ashlar Base Ring
    ctx.fillStyle = 'rgba(15, 20, 28, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 63, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    const apronRx = 56;
    const apronRy = 27.5;
    ctx.fillStyle = '#8b949e';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, apronRx, apronRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Two-Course Cylindrical Stone Basin Wall & Wide Coping Rim
    const basinRx = 47;
    const basinRy = 22.5;
    const wallDrop = 14;
    const rimY = y - 10;

    ctx.fillStyle = '#646d75';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, rimY, basinRx, basinRy, 0, 0, Math.PI);
    ctx.lineTo(x - basinRx, rimY + wallDrop);
    ctx.ellipse(x, rimY + wallDrop, basinRx, basinRy, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#adb5bd';
    ctx.beginPath();
    ctx.ellipse(x, rimY, basinRx + 1.5, basinRy + 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Crystal-Blue Pool & 4-Point Star Sparkles
    const poolRx = 38;
    const poolRy = 18;
    ctx.fillStyle = '#29b6f6';
    ctx.beginPath();
    ctx.ellipse(x, rimY + 1.5, poolRx - 1, poolRy - 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Middle & Upper Stone Bowls + Conical Finial + 4 Ribbon Waterfalls
    const midY = rimY - 22;
    const topBowlY = midY - 18;

    ctx.fillStyle = '#6c757d';
    ctx.fillRect(x - 8, midY, 16, 22);
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath();
    ctx.ellipse(x, midY, 22, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const ox of [-13.5, 13.5]) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + ox - 3, midY + 6, 6, 18);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + ox, rimY + 4, 5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#6c757d';
    ctx.fillRect(x - 5, topBowlY, 10, 18);
    ctx.fillStyle = '#ced4da';
    ctx.beginPath();
    ctx.ellipse(x, topBowlY, 13.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const ox of [-7.8, 7.8]) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + ox - 2, topBowlY + 4, 4, 15);
    }

    // Conical Acorn Finial
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath();
    ctx.moveTo(x, topBowlY - 19);
    ctx.lineTo(x + 5, topBowlY - 1);
    ctx.lineTo(x - 5, topBowlY - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Star Sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 24, rimY - 3, 2 + Math.sin(phase) * 0.5, 0, Math.PI * 2);
    ctx.arc(x + 23, rimY - 2, 2 + Math.cos(phase) * 0.5, 0, Math.PI * 2);
    ctx.fill();

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
    lightCount: number,
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

      if (isTown && daylight) {
        const darkAlpha = Math.min(0.68, Math.max(0.0, daylight.ambientDarkness));
        const [r, g, b] = daylight.shadowTintRgb ?? [10, 18, 36];
        lctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${darkAlpha.toFixed(3)})`;
      } else {
        lctx.fillStyle = isTown ? 'rgba(12, 19, 34, 0.14)' : 'rgba(3, 5, 10, 0.78)';
      }
      lctx.fillRect(0, 0, lw, lh);

      lctx.globalCompositeOperation = 'destination-out';

      const punchLight = (sx: number, sy: number, radius: number, strength: number, seed = 0) => {
        if (strength <= 0.01) return;
        const lx = sx * scaleX;
        const ly = sy * scaleY;
        const lr = Math.max(4, radius * scaleX);
        const breatheX = 1.32 + Math.sin(gameTime * 2.7 + seed) * 0.05;
        const breatheY = 0.86 + Math.cos(gameTime * 3.1 + seed * 1.3) * 0.04;
        const rx = lr * breatheX;
        const ry = lr * breatheY;

        if (this.lightCutoutSprite) {
          lctx.globalAlpha = Math.min(1, strength * 0.46);
          lctx.drawImage(
            this.lightCutoutSprite,
            lx - rx * 1.48,
            ly - ry * 1.38,
            rx * 2.96,
            ry * 2.76
          );
          lctx.globalAlpha = Math.min(1, strength * 0.92);
          lctx.drawImage(this.lightCutoutSprite, lx - rx, ly - ry, rx * 2, ry * 2);
        } else {
          const grad = lctx.createRadialGradient(lx, ly, lr * 0.08, lx, ly, rx);
          grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1, strength)})`);
          grad.addColorStop(0.55, `rgba(0, 0, 0, ${Math.min(1, strength * 0.42)})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lctx.fillStyle = grad;
          lctx.beginPath();
          lctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
          lctx.fill();
        }
      };

      punchLight(playerX, playerY - 12, heroRadius, 0.96, 1.1);

      for (let i = 0; i < lightCount; i++) {
        const l = lights[i];
        punchLight(l.x, l.y, l.radius, l.intensity, i * 1.7);
      }

      lctx.globalAlpha = 1;
      lctx.restore();

      ctx.drawImage(this.lightmapCanvas, 0, 0, this.width, this.height);
    }

    // 2. Pre-baked Colored Illumination Sprites (zero per-frame createRadialGradient!)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const drawSoftColoredLight = (
      lx: number,
      ly: number,
      radius: number,
      color: string,
      alpha: number
    ) => {
      if (alpha <= 0.004 || radius <= 2) return;
      const rx = radius * 1.36;
      const ry = radius * 0.84;
      const sprite = this.getColoredLightSprite(color);
      if (sprite) {
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, lx - rx, ly - ry, rx * 2, ry * 2);
      }
    };

    const bloomBoost = isTown ? 0.08 + 0.08 * lanternFactor : 0.13;
    for (let i = 0; i < lightCount; i++) {
      const l = lights[i];
      if (l.intensity <= 0.02) continue;
      drawSoftColoredLight(l.x, l.y, l.radius * 0.72, l.color, bloomBoost * l.intensity);
    }

    if (isPlayerAttacking || (isNightInTown && lanternFactor > 0.1)) {
      drawSoftColoredLight(
        playerX,
        playerY - 12,
        isPlayerAttacking ? 125 : 110,
        '#fbbf24',
        isPlayerAttacking ? 0.14 : 0.09 * lanternFactor
      );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawAtmosphericMotes(
    ctx: CanvasRenderingContext2D,
    _camera: Camera,
    theme: DungeonThemeConfig,
    isTown: boolean,
    _gameTime: number
  ) {
    if (isTown) return;
    const fw = Math.max(1, Math.floor(this.width * 0.25));
    const fh = Math.max(1, Math.floor(this.height * 0.25));

    if (
      !this.fogCanvas ||
      this.fogCanvas.width !== fw ||
      this.fogCanvas.height !== fh ||
      this.fogThemeId !== theme.id
    ) {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        if (!this.fogCanvas) {
          this.fogCanvas = document.createElement('canvas');
        }
        this.fogCanvas.width = fw;
        this.fogCanvas.height = fh;
        const fctx = this.fogCanvas.getContext('2d');
        if (fctx) {
          const outerRadius = Math.hypot(fw, fh) * 0.55;
          const innerRadius = Math.min(fw, fh) * 0.34;
          const fogGrad = fctx.createRadialGradient(
            fw * 0.5,
            fh * 0.5,
            innerRadius,
            fw * 0.5,
            fh * 0.5,
            outerRadius
          );
          fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          fogGrad.addColorStop(0.75, theme.fogColor || 'rgba(15, 23, 42, 0.14)');
          fogGrad.addColorStop(1, 'rgba(2, 4, 9, 0.24)');
          fctx.clearRect(0, 0, fw, fh);
          fctx.fillStyle = fogGrad;
          fctx.fillRect(0, 0, fw, fh);
          this.fogThemeId = theme.id;
        }
      }
    }

    if (this.fogCanvas) {
      ctx.drawImage(this.fogCanvas, 0, 0, this.width, this.height);
    }
  }
}
