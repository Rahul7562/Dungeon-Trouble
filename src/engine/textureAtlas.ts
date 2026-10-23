import { DungeonThemeConfig } from './world';

export interface SpriteAtlasRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw?: number;
  dh?: number;
}

export interface BakedThemeAtlas {
  themeId: string;
  masterSheet: HTMLCanvasElement;
  rectMap: WeakMap<HTMLCanvasElement, SpriteAtlasRect>;
  floorSprites: HTMLCanvasElement[];
  wallSprites: HTMLCanvasElement[];
  townRoadSprites: HTMLCanvasElement[];
  townGrassSprites: HTMLCanvasElement[];
  townInteriorWoodSprites: HTMLCanvasElement[];
  townInteriorStoneSprites: HTMLCanvasElement[];
  townInteriorCarpetSprites: HTMLCanvasElement[];
  townWallSprites: HTMLCanvasElement[];
  townTreeSprites: HTMLCanvasElement[];
  townWaterShallowSprites: HTMLCanvasElement[];
  townWaterDeepSprites: HTMLCanvasElement[];
  townWaterShallowFrames: HTMLCanvasElement[][];
  townWaterDeepFrames: HTMLCanvasElement[][];
  fountainFrames: HTMLCanvasElement[];
  townGrassFrames: HTMLCanvasElement[][];
  townTreeFrames: HTMLCanvasElement[][];
  shorelineSprites: HTMLCanvasElement[];
  roadEdgeSprites: HTMLCanvasElement[];
  voidBedrockSprites: HTMLCanvasElement[];
}

// Deterministic spatial hash that avoids repeating grid stripes
export function spatialHash(tx: number, ty: number, salt = 0): number {
  let h = (tx * 374761393 + ty * 668265263 + salt * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Convert normalized isometric UV (u, v in [0, 1]) to screen offset relative to tile center (cx, cy)
function isoUV(cx: number, cy: number, u: number, v: number, hw = 32, hh = 16): { x: number; y: number } {
  const isoX = (u - v) * hw;
  const isoY = (u + v - 1) * hh;
  return { x: cx + isoX, y: cy + isoY };
}

// Parse hex color to RGB components
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function adjustColor(hex: string, delta: number, alpha = 1): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgba(${clamp(r + delta)}, ${clamp(g + delta)}, ${clamp(b + delta)}, ${alpha})`;
}

interface SharedTownSprites {
  shorelineSprites: HTMLCanvasElement[];
  roadEdgeSprites: HTMLCanvasElement[];
  townRoadSprites: HTMLCanvasElement[];
  townGrassSprites: HTMLCanvasElement[];
  townInteriorWoodSprites: HTMLCanvasElement[];
  townInteriorStoneSprites: HTMLCanvasElement[];
  townInteriorCarpetSprites: HTMLCanvasElement[];
  townWallSprites: HTMLCanvasElement[];
  townTreeSprites: HTMLCanvasElement[];
  townWaterShallowSprites: HTMLCanvasElement[];
  townWaterDeepSprites: HTMLCanvasElement[];
  townWaterShallowFrames: HTMLCanvasElement[][];
  townWaterDeepFrames: HTMLCanvasElement[][];
  fountainFrames: HTMLCanvasElement[];
  townGrassFrames: HTMLCanvasElement[][];
  townTreeFrames: HTMLCanvasElement[][];
}

export class TileAtlasBank {
  private cache = new Map<string, BakedThemeAtlas>();
  private sharedTown: SharedTownSprites | null = null;
  private canUseDOMCanvas: boolean;

  constructor() {
    this.canUseDOMCanvas =
      typeof document !== 'undefined' && typeof document.createElement === 'function';
  }

  private getSharedTownSprites(): SharedTownSprites {
    if (this.sharedTown) return this.sharedTown;

    const shared: SharedTownSprites = {
      shorelineSprites: [],
      roadEdgeSprites: [],
      townRoadSprites: [],
      townGrassSprites: [],
      townInteriorWoodSprites: [],
      townInteriorStoneSprites: [],
      townInteriorCarpetSprites: [],
      townWallSprites: [],
      townTreeSprites: [],
      townWaterShallowSprites: [],
      townWaterDeepSprites: [],
      townWaterShallowFrames: [],
      townWaterDeepFrames: [],
      fountainFrames: [],
      townGrassFrames: [],
      townTreeFrames: [],
    };

    for (let v = 0; v < 16; v++) {
      shared.shorelineSprites.push(this.bakeShorelineMaskSprite(v));
      shared.roadEdgeSprites.push(this.bakeRoadGrassEdgeMaskSprite(v));
    }
    for (let v = 0; v < 8; v++) {
      shared.townRoadSprites.push(this.bakeTownFloorVariant(true, v, 0));
    }
    for (let f = 0; f < 4; f++) {
      const grassFrameRow: HTMLCanvasElement[] = [];
      const treeFrameRow: HTMLCanvasElement[] = [];
      for (let v = 0; v < 8; v++) {
        grassFrameRow.push(this.bakeTownFloorVariant(false, v, f));
        treeFrameRow.push(this.bakeTownTreeVariant(v, f));
      }
      shared.townGrassFrames.push(grassFrameRow);
      shared.townTreeFrames.push(treeFrameRow);
    }
    for (let v = 0; v < 8; v++) {
      shared.townGrassSprites.push(shared.townGrassFrames[0][v]);
      shared.townWallSprites.push(this.bakeTownWallVariant(v));
      shared.townTreeSprites.push(shared.townTreeFrames[0][v]);
    }
    for (let v = 0; v < 4; v++) {
      shared.townInteriorWoodSprites.push(this.bakeTownInteriorFloorVariant('oak_planks', v));
      shared.townInteriorStoneSprites.push(this.bakeTownInteriorFloorVariant('stone_flag', v));
      shared.townInteriorCarpetSprites.push(this.bakeTownInteriorFloorVariant('royal_carpet', v));
    }
    for (let f = 0; f < 4; f++) {
      const shallowRow: HTMLCanvasElement[] = [];
      const deepRow: HTMLCanvasElement[] = [];
      for (let v = 0; v < 4; v++) {
        shallowRow.push(this.bakeTownWaterVariant(false, v, f));
        deepRow.push(this.bakeTownWaterVariant(true, v, f));
      }
      shared.townWaterShallowFrames.push(shallowRow);
      shared.townWaterDeepFrames.push(deepRow);
      shared.fountainFrames.push(this.bakeFountainFrame(f));
    }
    for (let v = 0; v < 4; v++) {
      shared.townWaterShallowSprites.push(shared.townWaterShallowFrames[0][v]);
      shared.townWaterDeepSprites.push(shared.townWaterDeepFrames[0][v]);
    }

    this.sharedTown = shared;
    return shared;
  }

  public getAtlas(theme: DungeonThemeConfig): BakedThemeAtlas | null {
    if (!this.canUseDOMCanvas) return null;
    const existing = this.cache.get(theme.id);
    if (existing) return existing;

    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx) {
      this.canUseDOMCanvas = false;
      return null;
    }

    const town = this.getSharedTownSprites();
    const masterSheet = document.createElement('canvas');
    masterSheet.width = 2048;
    masterSheet.height = 1280;

    const baked: BakedThemeAtlas = {
      themeId: theme.id,
      masterSheet,
      rectMap: new WeakMap<HTMLCanvasElement, SpriteAtlasRect>(),
      floorSprites: [],
      wallSprites: [],
      voidBedrockSprites: [],
      ...town,
    };

    for (let v = 0; v < 16; v++) {
      baked.floorSprites.push(this.bakeDungeonFloorVariant(theme, v));
    }
    for (let v = 0; v < 4; v++) {
      baked.voidBedrockSprites.push(this.bakeVoidBedrockSprite(theme, v));
    }
    for (let v = 0; v < 8; v++) {
      baked.wallSprites.push(this.bakeDungeonWallVariant(theme, v));
    }

    this.packMasterSheet(baked);
    this.cache.set(theme.id, baked);
    return baked;
  }

  /**
   * Packs all individual offscreen sprite canvases onto a single consolidated Master Texture Sheet
   * so the SpriteBatcher can draw the entire tile/wall/tree pass from a single bound texture.
   */
  private packMasterSheet(baked: BakedThemeAtlas): void {
    const ctx = baked.masterSheet.getContext('2d');
    if (!ctx) return;

    const allSprites: HTMLCanvasElement[] = [
      ...baked.floorSprites,
      ...baked.shorelineSprites,
      ...baked.roadEdgeSprites,
      ...baked.voidBedrockSprites,
      ...baked.townRoadSprites,
      ...baked.townGrassSprites,
      ...baked.townInteriorWoodSprites,
      ...baked.townInteriorStoneSprites,
      ...baked.townInteriorCarpetSprites,
      ...baked.wallSprites,
      ...baked.townWallSprites,
    ];
    for (const row of baked.townGrassFrames) allSprites.push(...row);
    for (const row of baked.townWaterShallowFrames) allSprites.push(...row);
    for (const row of baked.townWaterDeepFrames) allSprites.push(...row);
    for (const row of baked.townTreeFrames) allSprites.push(...row);
    allSprites.push(...baked.fountainFrames);

    const sheetW = baked.masterSheet.width;
    let curX = 2;
    let curY = 2;
    let rowMaxH = 0;

    for (const sp of allSprites) {
      if (baked.rectMap.has(sp)) continue;
      const w = sp.width;
      const h = sp.height;
      const logicalW = (sp as HTMLCanvasElement & { logicalWidth?: number }).logicalWidth ?? w;
      const logicalH = (sp as HTMLCanvasElement & { logicalHeight?: number }).logicalHeight ?? h;
      if (curX + w + 2 > sheetW) {
        curX = 2;
        curY += rowMaxH + 2;
        rowMaxH = 0;
      }
      if (curY + h + 2 <= baked.masterSheet.height) {
        ctx.drawImage(sp, curX, curY);
        baked.rectMap.set(sp, { sx: curX, sy: curY, sw: w, sh: h, dw: logicalW, dh: logicalH });
        curX += w + 2;
        if (h > rowMaxH) rowMaxH = h;
      }
    }
  }

  private drawReferenceStoneBrick(
    ctx: CanvasRenderingContext2D,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    baseCol: string,
    upperBandCol: string,
    lowerBandCol: string,
    highlightCol: string,
    shadowCol: string,
    crackType: number
  ) {
    const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
    const bilerp = (u: number, v: number) => {
      const top = lerpPt(p0, p1, u);
      const bot = lerpPt(p3, p2, u);
      return lerpPt(top, bot, v);
    };

    // 1. Chamfered 8-point brick silhouette (replicates the notched pixel-art brick corners at mortar T-junctions)
    const chU = 0.08;
    const chV = 0.14;
    const c0a = bilerp(chU, 0);
    const c0b = bilerp(0, chV);
    const c1a = bilerp(1 - chU, 0);
    const c1b = bilerp(1, chV);
    const c2a = bilerp(1, 1 - chV);
    const c2b = bilerp(1 - chU, 1);
    const c3a = bilerp(chU, 1);
    const c3b = bilerp(0, 1 - chV);

    ctx.beginPath();
    ctx.moveTo(c0a.x, c0a.y);
    ctx.lineTo(c1a.x, c1a.y);
    ctx.lineTo(c1b.x, c1b.y);
    ctx.lineTo(c2a.x, c2a.y);
    ctx.lineTo(c2b.x, c2b.y);
    ctx.lineTo(c3a.x, c3a.y);
    ctx.lineTo(c3b.x, c3b.y);
    ctx.lineTo(c0b.x, c0b.y);
    ctx.closePath();
    ctx.fillStyle = baseCol;
    ctx.fill();

    // 2. Upper-half lighter stone band (matching the horizontal stepped pixel-art shading in reference image)
    const uTopL = bilerp(0.05, 0.08);
    const uTopR = bilerp(0.95, 0.08);
    const uMidR = bilerp(0.95, 0.44);
    const uMidL = bilerp(0.05, 0.44);
    ctx.fillStyle = upperBandCol;
    ctx.beginPath();
    ctx.moveTo(uTopL.x, uTopL.y);
    ctx.lineTo(uTopR.x, uTopR.y);
    ctx.lineTo(uMidR.x, uMidR.y);
    ctx.lineTo(uMidL.x, uMidL.y);
    ctx.closePath();
    ctx.fill();

    // 3. Lower-half darker stone recess band (above bottom mortar)
    const lMidL = bilerp(0.04, 0.72);
    const lMidR = bilerp(0.96, 0.72);
    const lBotR = bilerp(0.94, 0.94);
    const lBotL = bilerp(0.06, 0.94);
    ctx.fillStyle = lowerBandCol;
    ctx.beginPath();
    ctx.moveTo(lMidL.x, lMidL.y);
    ctx.lineTo(lMidR.x, lMidR.y);
    ctx.lineTo(lBotR.x, lBotR.y);
    ctx.lineTo(lBotL.x, lBotL.y);
    ctx.closePath();
    ctx.fill();

    // 4. Crisp top & left sunlit bevel rim (signature sharp light edge from reference image)
    ctx.strokeStyle = highlightCol;
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(c3b.x, c3b.y);
    ctx.lineTo(c0b.x, c0b.y);
    ctx.lineTo(c0a.x, c0a.y);
    ctx.lineTo(c1a.x, c1a.y);
    ctx.stroke();

    // Bright specular corner glint on top-left bevel
    const specA = bilerp(0.08, 0.06);
    const specB = bilerp(0.42, 0.06);
    ctx.strokeStyle = 'rgba(176, 188, 204, 0.65)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(specA.x, specA.y);
    ctx.lineTo(specB.x, specB.y);
    ctx.stroke();

    // 5. Crisp bottom & right dark inner bevel
    ctx.strokeStyle = shadowCol;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c1b.x, c1b.y);
    ctx.lineTo(c2a.x, c2a.y);
    ctx.lineTo(c2b.x, c2b.y);
    ctx.lineTo(c3a.x, c3a.y);
    ctx.stroke();

    // 6. Stepped pixel-art surface cracks, chips & pits (directly modeled on reference image)
    if (crackType === 1) {
      // Stepped zig-zag crack descending from top edge
      const k0 = bilerp(0.56, 0.02);
      const k1 = bilerp(0.56, 0.36);
      const k2 = bilerp(0.42, 0.48);
      const k3 = bilerp(0.42, 0.76);
      ctx.strokeStyle = '#1d2128';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(k0.x, k0.y);
      ctx.lineTo(k1.x, k1.y);
      ctx.lineTo(k2.x, k2.y);
      ctx.lineTo(k3.x, k3.y);
      ctx.stroke();

      // 1px bright catch-light alongside the crack
      ctx.strokeStyle = highlightCol;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(k1.x + 0.8, k1.y + 0.4);
      ctx.lineTo(k2.x + 0.8, k2.y + 0.4);
      ctx.lineTo(k3.x + 0.8, k3.y + 0.4);
      ctx.stroke();
    } else if (crackType === 2) {
      // Chiseled stone pit / indentation with bottom highlight
      const pitC = bilerp(0.36, 0.52);
      ctx.fillStyle = '#282e37';
      ctx.fillRect(pitC.x - 1.6, pitC.y - 0.9, 3.2, 1.7);
      ctx.fillStyle = highlightCol;
      ctx.fillRect(pitC.x - 1.4, pitC.y + 0.8, 2.8, 0.75);
    } else if (crackType === 3) {
      // Stepped diagonal fracture from bottom mortar
      const k0 = bilerp(0.32, 0.96);
      const k1 = bilerp(0.32, 0.62);
      const k2 = bilerp(0.52, 0.46);
      ctx.strokeStyle = '#1d2128';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(k0.x, k0.y);
      ctx.lineTo(k1.x, k1.y);
      ctx.lineTo(k2.x, k2.y);
      ctx.stroke();
    }
  }

  private renderStaggeredBrickTile(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    variant: number,
    mortarColor: string,
    brickPalettes: {
      base: string;
      upper: string;
      lower: string;
      highlight: string;
      shadow: string;
    }[]
  ) {
    // 4 horizontal courses of staggered running-bond stone bricks (exact layout from reference image)
    const courseV = [0.01, 0.255, 0.50, 0.745, 0.99];
    const gapU = 0.024;
    const gapV = 0.026;

    // Fill deep charcoal-black mortar bed across the tile diamond
    const hw = 33.3;
    const hh = 16.65;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = mortarColor;
    ctx.fill();

    for (let r = 0; r < 4; r++) {
      const v0 = courseV[r] + gapV;
      const v1 = courseV[r + 1] - gapV;

      // Alternate staggered running bond joints per course (like reference image rows 0..3)
      const staggerType = (r + (variant % 2)) % 4;
      let uSplits: number[];
      if (staggerType === 0) {
        // Two wide bricks meeting near center-left
        uSplits = [0.01, 0.46, 0.99];
      } else if (staggerType === 1) {
        // Half-brick left, full center brick, half-brick right
        uSplits = [0.01, 0.24, 0.76, 0.99];
      } else if (staggerType === 2) {
        // Two wide bricks meeting near center-right
        uSplits = [0.01, 0.56, 0.99];
      } else {
        // Three bricks with staggered joints
        uSplits = [0.01, 0.30, 0.70, 0.99];
      }

      for (let c = 0; c < uSplits.length - 1; c++) {
        const u0 = uSplits[c] + gapU;
        const u1 = uSplits[c + 1] - gapU;

        const p0 = isoUV(cx, cy, u0, v0, 32, 16);
        const p1 = isoUV(cx, cy, u1, v0, 32, 16);
        const p2 = isoUV(cx, cy, u1, v1, 32, 16);
        const p3 = isoUV(cx, cy, u0, v1, 32, 16);

        const h = spatialHash(variant * 7 + r * 3, c * 5 + r, 131);
        const pal = brickPalettes[h % brickPalettes.length];
        const crackType = (h >>> 4) % 5; // 0,4 = clean; 1 = top stepped crack; 2 = pit; 3 = bottom crack

        this.drawReferenceStoneBrick(
          ctx,
          p0,
          p1,
          p2,
          p3,
          pal.base,
          pal.upper,
          pal.lower,
          pal.highlight,
          pal.shadow,
          crackType
        );
      }
    }
  }

  private getReferenceGreyBrickPalettes(): {
    base: string;
    upper: string;
    lower: string;
    highlight: string;
    shadow: string;
  }[] {
    // Darker charcoal-slate & weathered dungeon stone brick palette (restored darker shade)
    return [
      {
        base: '#4a525d',
        upper: '#5c6674',
        lower: '#373d47',
        highlight: '#7c8796',
        shadow: '#232830',
      },
      {
        base: '#525b67',
        upper: '#646f7d',
        lower: '#3d444f',
        highlight: '#8591a1',
        shadow: '#272c35',
      },
      {
        base: '#424953',
        upper: '#535c68',
        lower: '#30363f',
        highlight: '#717c8b',
        shadow: '#1e2229',
      },
      {
        base: '#58626f',
        upper: '#6b7685',
        lower: '#434b56',
        highlight: '#8e9aa9',
        shadow: '#2b313a',
      },
      {
        base: '#3d444e',
        upper: '#4d5662',
        lower: '#2c313a',
        highlight: '#6b7584',
        shadow: '#1a1e24',
      },
      {
        base: '#4e5763',
        upper: '#606a78',
        lower: '#3a414b',
        highlight: '#808b9b',
        shadow: '#252a32',
      },
    ];
  }

  private bakeDungeonFloorVariant(theme: DungeonThemeConfig, variant: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const cy = 20;
    const hw = 33.3;
    const hh = 16.65;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    // Darker reference charcoal-slate stone bricks for Forgotten Catacombs, or dark biome bricks for other themes
    const palettes =
      theme.id === 'forgotten_catacombs'
        ? this.getReferenceGreyBrickPalettes()
        : [0, 1, 2, 3, 4, 5].map((i) => {
            const shift = (i - 2) * 4;
            const baseHex = i % 2 === 0 ? theme.floorPrimary : theme.floorSecondary;
            return {
              base: adjustColor(baseHex, shift + 12),
              upper: adjustColor(baseHex, shift + 22),
              lower: adjustColor(baseHex, shift + 2),
              highlight: adjustColor(theme.floorBorder, shift + 36),
              shadow: adjustColor(baseHex, shift - 10),
            };
          });

    const mortarCol = theme.id === 'forgotten_catacombs' ? '#181c22' : '#12161f';
    this.renderStaggeredBrickTile(ctx, cx, cy, variant, mortarCol, palettes);

    // Subtle biome crevice accent on variants 8, 9, 10
    if (variant === 8 || variant === 9 || variant === 10) {
      const primaryMoss =
        theme.id === 'forgotten_catacombs'
          ? 'rgba(74, 124, 36, 0.55)'
          : theme.id === 'frozen_depths'
          ? 'rgba(56, 189, 248, 0.35)'
          : theme.id === 'corrupted_temple'
          ? 'rgba(147, 51, 234, 0.38)'
          : 'rgba(234, 88, 12, 0.42)';
      const pt = isoUV(cx, cy, 0.48, 0.5, 32, 16);
      ctx.fillStyle = primaryMoss;
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, 3.8, 1.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Etched glowing runic floor sigil (variant 15)
    if (variant === 15) {
      ctx.strokeStyle = theme.torchColor;
      ctx.globalAlpha = 0.52;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10, 5, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 3.5);
      ctx.lineTo(cx, cy + 3.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    return canvas;
  }

  private bakeTownFloorVariant(isRoad: boolean, variant: number, swayFrame = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;

    const cx = 36;
    const cy = 20;
    // Slightly oversized diamond (33.4 x 16.7) with ZERO border stroke so adjacent tiles fuse seamlessly
    const hw = 33.4;
    const hh = 16.7;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();

    if (isRoad) {
      // Reference Image Path Tile: Warm Biscuit-Tan / Sandy-Earth Dirt Path with Grey River Pebbles & Soil Contours
      const baseGrad = ctx.createLinearGradient(cx - hw * 0.5, cy - hh, cx + hw * 0.5, cy + hh);
      baseGrad.addColorStop(0.0, '#c29a70');
      baseGrad.addColorStop(0.5, '#b68e65');
      baseGrad.addColorStop(1.0, '#a88058');
      ctx.fillStyle = baseGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();

      // 1. Smooth Rounded Tan Soil Contour Patches (matching the subtle darker/lighter dirt patches in image.png)
      for (let p = 0; p < 10; p++) {
        const ph = spatialHash(p + variant * 13, variant * 7 + p, 313);
        const u = ((ph & 0xff) / 255) * 0.78 + 0.11;
        const v = (((ph >>> 8) & 0xff) / 255) * 0.78 + 0.11;
        const pt = isoUV(cx, cy, u, v, 32.0, 16.0);
        const rx = 3.2 + (((ph >>> 16) & 7) / 7) * 4.2;
        const ry = rx * 0.5;

        const isLight = (ph & 3) === 0;
        ctx.fillStyle = isLight ? 'rgba(212, 174, 132, 0.36)' : 'rgba(148, 108, 70, 0.34)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Embedded Grey River Stones & Warm Tan Pebbles (matching the distinct grey & brown pebbles in image.png)
      const pebbleCount = 5 + (variant % 3);
      for (let i = 0; i < pebbleCount; i++) {
        const ph = spatialHash(variant * 23 + i, i * 19 + variant, 853);
        const u = ((ph & 0xff) / 255) * 0.72 + 0.14;
        const v = (((ph >>> 8) & 0xff) / 255) * 0.72 + 0.14;
        const pt = isoUV(cx, cy, u, v, 31.0, 15.5);
        const isGreyStone = (i + variant) % 2 === 0;
        const rx = isGreyStone ? 2.1 + ((ph >>> 16) & 3) * 0.45 : 1.4 + ((ph >>> 16) & 3) * 0.3;
        const ry = rx * 0.56;
        const rot = (((ph >>> 18) & 7) - 3.5) * 0.1;

        // Crisp dark-earth pocket shadow underneath stone
        ctx.fillStyle = 'rgba(92, 62, 35, 0.65)';
        ctx.beginPath();
        ctx.ellipse(pt.x + 0.4, pt.y + 0.55, rx + 0.35, ry + 0.25, rot, 0, Math.PI * 2);
        ctx.fill();

        // Main pebble body (cool slate-grey river stone or warm brown stone as in image.png)
        ctx.fillStyle = isGreyStone
          ? (ph & 4) !== 0
            ? '#8b9196'
            : '#787e84'
          : '#8c6947';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();

        // Sunlit top-left bevel highlight on stone
        ctx.fillStyle = isGreyStone ? '#b8bec4' : '#b5906b';
        ctx.beginPath();
        ctx.ellipse(pt.x - rx * 0.24, pt.y - ry * 0.26, rx * 0.52, ry * 0.46, rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Subtle Fine Dirt Specks
      for (let g = 0; g < 16; g++) {
        const gh = spatialHash(variant * 31 + g, g * 7, 991);
        const u = ((gh & 0xff) / 255) * 0.84 + 0.08;
        const v = (((gh >>> 8) & 0xff) / 255) * 0.84 + 0.08;
        const gpt = isoUV(cx, cy, u, v, 32.0, 16.0);
        ctx.fillStyle = (gh & 1) === 0 ? 'rgba(218, 182, 140, 0.55)' : 'rgba(132, 94, 58, 0.50)';
        ctx.beginPath();
        ctx.arc(gpt.x, gpt.y, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Reference Image Lush Emerald-Lime Meadow Grass Tile
      const grassGrad = ctx.createLinearGradient(cx - hw * 0.5, cy - hh, cx + hw * 0.5, cy + hh);
      grassGrad.addColorStop(0.0, '#55b32e');
      grassGrad.addColorStop(0.5, '#48a126');
      grassGrad.addColorStop(1.0, '#3d8f20');
      ctx.fillStyle = grassGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();

      // 1. Soft Sunlit Lime & Deep Forest Turf Dappling
      for (let p = 0; p < 10; p++) {
        const gh = spatialHash(p + variant * 9, variant * 5 + p, 271);
        const u = ((gh & 0xff) / 255) * 0.82 + 0.09;
        const v = (((gh >>> 8) & 0xff) / 255) * 0.82 + 0.09;
        const pt = isoUV(cx, cy, u, v, 32.0, 16.0);
        const rx = 4.2 + ((gh >>> 16) & 7) * 0.65;
        const ry = rx * 0.5;

        ctx.fillStyle = (gh & 1) === 0 ? 'rgba(122, 212, 59, 0.22)' : 'rgba(34, 98, 22, 0.20)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Fan-Shaped Grass Blade Clumps (Matching the crisp 5-blade grass tuft sprite in image.png)
      const swayPhase = (swayFrame / 4) * Math.PI * 2;
      const tuftCount = 3 + (variant % 2);
      for (let t = 0; t < tuftCount; t++) {
        const th = spatialHash(variant * 11 + t, t, 509);
        const u = ((th & 0xff) / 255) * 0.60 + 0.20;
        const v = (((th >>> 8) & 0xff) / 255) * 0.60 + 0.20;
        const pt = isoUV(cx, cy, u, v, 30, 15);
        const windBend = Math.sin(swayPhase + t * 0.8 + variant * 0.5) * 1.6;

        // Ground shadow oval under grass clump
        ctx.fillStyle = 'rgba(20, 62, 14, 0.48)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 1.2, 4.4, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        const blades = [
          { dx: -3.2, dy: -3.4, col: '#256e18', swayScale: 0.7 },
          { dx: -1.6, dy: -5.0, col: '#3b9624', swayScale: 0.95 },
          { dx: 0.0, dy: -5.8, col: '#84cc16', swayScale: 1.15 },
          { dx: 1.6, dy: -4.8, col: '#65c431', swayScale: 1.0 },
          { dx: 3.1, dy: -3.2, col: '#2d7d1d', swayScale: 0.75 },
        ];
        ctx.lineWidth = 1.25;
        ctx.lineCap = 'round';
        for (const bl of blades) {
          const tipBend = windBend * bl.swayScale;
          ctx.strokeStyle = bl.col;
          ctx.beginPath();
          ctx.moveTo(pt.x + bl.dx * 0.28, pt.y + 0.8);
          ctx.quadraticCurveTo(
            pt.x + bl.dx * 0.6 + tipBend * 0.4,
            pt.y + bl.dy * 0.55,
            pt.x + bl.dx + tipBend,
            pt.y + bl.dy
          );
          ctx.stroke();
        }
      }

      // 3. Blooming Wildflower Clumps on Variants 1, 2, 4, 6 (Matching the 3-blossom flower tuft in image.png)
      const flowerSway = Math.sin(swayPhase + variant) * 1.4;
      if (variant === 1 || variant === 2 || variant === 4 || variant === 6) {
        const fPt = isoUV(cx, cy, variant % 2 === 0 ? 0.48 : 0.54, 0.48, 28, 14);
        // Dark foliage rosette base
        ctx.fillStyle = '#1e5614';
        ctx.beginPath();
        ctx.ellipse(fPt.x, fPt.y + 1.4, 5.2, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Broad green basal leaves fanning out
        ctx.fillStyle = '#48a126';
        ctx.beginPath();
        ctx.ellipse(fPt.x - 2.6, fPt.y + 0.5, 2.8, 1.2, -0.35, 0, Math.PI * 2);
        ctx.ellipse(fPt.x + 2.6, fPt.y + 0.5, 2.8, 1.2, 0.35, 0, Math.PI * 2);
        ctx.ellipse(fPt.x, fPt.y - 0.2, 2.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3 Flower Stems & Multi-Petal Blossoms (Orange, Yellow, Pink/White as in image.png)
        const stems = [
          { ox: -2.6, oy: -4.2, petal: variant === 2 ? '#f472b6' : '#fb923c', core: '#fef08a' },
          { ox: 0.2, oy: -5.6, petal: '#facc15', core: '#b45309' },
          { ox: 2.8, oy: -3.8, petal: variant === 6 ? '#f8fafc' : '#fb923c', core: '#facc15' },
        ];
        ctx.strokeStyle = '#2d7d1d';
        ctx.lineWidth = 1.1;
        for (const st of stems) {
          const bx = fPt.x + st.ox + flowerSway * 0.5;
          const by = fPt.y + st.oy;
          ctx.beginPath();
          ctx.moveTo(fPt.x + st.ox * 0.3, fPt.y + 0.5);
          ctx.lineTo(bx, by);
          ctx.stroke();

          ctx.fillStyle = st.petal;
          ctx.beginPath();
          ctx.arc(bx, by, 1.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = st.core;
          ctx.beginPath();
          ctx.arc(bx, by, 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
    return canvas;
  }

  private bakeDungeonWallVariant(theme: DungeonThemeConfig, variant: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const baseY = 74; // Ground center of the isometric diamond
    const hw = 32;
    const hh = 16;
    const wallH = 52;

    // 1. Soft base ambient occlusion skirt on the ground around the wall
    const aoGrad = ctx.createRadialGradient(cx, baseY + 4, 8, cx, baseY + 4, 35);
    aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
    aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aoGrad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 4, 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Left Face (South-West — illuminated by directional light)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - hw, baseY);
    ctx.lineTo(cx, baseY + hh);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.lineTo(cx - hw, baseY - wallH);
    ctx.closePath();

    const leftGrad = ctx.createLinearGradient(cx - hw, baseY - wallH, cx, baseY + hh);
    leftGrad.addColorStop(0, adjustColor(theme.wallRight, 14));
    leftGrad.addColorStop(0.7, adjustColor(theme.wallRight, 2));
    leftGrad.addColorStop(1, adjustColor(theme.wallLeft, -8));
    ctx.fillStyle = leftGrad;
    ctx.fill();
    ctx.clip();

    // Draw 4 courses of staggered ashlar stone blocks on Left Face
    const courses = 4;
    for (let c = 0; c < courses; c++) {
      const t0 = c / courses;
      const t1 = (c + 1) / courses;
      const yTopL = baseY - wallH + t0 * wallH;
      const yTopR = baseY + hh - wallH + t0 * wallH;
      const yBotL = baseY - wallH + t1 * wallH;
      const yBotR = baseY + hh - wallH + t1 * wallH;

      // Horizontal mortar groove
      if (c > 0) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.68)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - hw, yTopL);
        ctx.lineTo(cx, yTopR);
        ctx.stroke();

        // Top edge highlight of the lower brick course
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - hw, yTopL + 1.1);
        ctx.lineTo(cx, yTopR + 1.1);
        ctx.stroke();
      }

      // Vertical mortar joints (staggered per course)
      const split = (c + variant) % 2 === 0 ? 0.45 : 0.62;
      const jx = cx - hw + split * hw;
      const jyTop = yTopL + split * hh;
      const jyBot = yBotL + split * hh;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.62)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(jx, jyTop);
      ctx.lineTo(jx, jyBot);
      ctx.stroke();

      // Subtle brick shade modulation
      if ((c + variant) % 3 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.moveTo(cx - hw, yTopL);
        ctx.lineTo(jx, jyTop);
        ctx.lineTo(jx, jyBot);
        ctx.lineTo(cx - hw, yBotL);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Recessed gothic arch niche on variant 6
    if (variant === 6) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      ctx.moveTo(cx - 22, baseY + 3);
      ctx.lineTo(cx - 22, baseY - 22);
      ctx.quadraticCurveTo(cx - 15, baseY - 30, cx - 9, baseY - 19);
      ctx.lineTo(cx - 9, baseY + 9);
      ctx.closePath();
      ctx.fill();
    }

    // Creeping moss / biome glow at bottom of wall on variants 3 & 5
    if (variant === 3 || variant === 5) {
      ctx.fillStyle =
        theme.id === 'forgotten_catacombs'
          ? 'rgba(54, 83, 20, 0.55)'
          : theme.id === 'frozen_depths'
          ? 'rgba(56, 189, 248, 0.35)'
          : theme.id === 'corrupted_temple'
          ? 'rgba(147, 51, 234, 0.38)'
          : 'rgba(234, 88, 12, 0.42)';
      ctx.beginPath();
      ctx.ellipse(cx - 16, baseY + 4, 14, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cornice overhang drop-shadow at top of Left Face
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.moveTo(cx - hw, baseY - wallH);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.lineTo(cx, baseY + hh - wallH + 5);
    ctx.lineTo(cx - hw, baseY - wallH + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 3. Right Face (South-East — deeper directional shadow)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh);
    ctx.lineTo(cx + hw, baseY);
    ctx.lineTo(cx + hw, baseY - wallH);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.closePath();

    const rightGrad = ctx.createLinearGradient(cx, baseY - wallH, cx + hw, baseY + hh);
    rightGrad.addColorStop(0, adjustColor(theme.wallLeft, 4));
    rightGrad.addColorStop(0.65, adjustColor(theme.wallLeft, -6));
    rightGrad.addColorStop(1, adjustColor(theme.wallLeft, -18));
    ctx.fillStyle = rightGrad;
    ctx.fill();
    ctx.clip();

    for (let c = 0; c < courses; c++) {
      const t0 = c / courses;
      const t1 = (c + 1) / courses;
      const yTopL = baseY + hh - wallH + t0 * wallH;
      const yTopR = baseY - wallH + t0 * wallH;
      const yBotL = baseY + hh - wallH + t1 * wallH;
      const yBotR = baseY - wallH + t1 * wallH;

      if (c > 0) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, yTopL);
        ctx.lineTo(cx + hw, yTopR);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, yTopL + 1);
        ctx.lineTo(cx + hw, yTopR + 1);
        ctx.stroke();
      }

      const split = (c + variant) % 2 === 0 ? 0.56 : 0.38;
      const jx = cx + split * hw;
      const jyTop = yTopL - split * hh;
      const jyBot = yBotL - split * hh;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(jx, jyTop);
      ctx.lineTo(jx, jyBot);
      ctx.stroke();
    }

    // Weathering fracture crack on Right Face (variants 4 & 7)
    if (variant === 4 || variant === 7) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + 10, baseY - wallH + 10);
      ctx.lineTo(cx + 16, baseY - wallH + 26);
      ctx.lineTo(cx + 12, baseY - wallH + 40);
      ctx.stroke();
    }

    // Cornice shadow under top cap on Right Face
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh - wallH);
    ctx.lineTo(cx + hw, baseY - wallH);
    ctx.lineTo(cx + hw, baseY - wallH + 5);
    ctx.lineTo(cx, baseY + hh - wallH + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 4. Vertical front corner spine bevel highlight (separating Left and Right faces)
    ctx.strokeStyle = adjustColor(theme.wallBorder, 16, 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.stroke();

    // 5. Top Cap Face (Beveled 3D Cornice & Recessed Parapet Core)
    const topY = baseY - wallH;
    ctx.beginPath();
    ctx.moveTo(cx, topY - hh);
    ctx.lineTo(cx + hw, topY);
    ctx.lineTo(cx, topY + hh);
    ctx.lineTo(cx - hw, topY);
    ctx.closePath();

    const topGrad = ctx.createLinearGradient(cx - hw, topY - hh, cx + hw, topY + hh);
    topGrad.addColorStop(0, adjustColor(theme.wallTop, 16));
    topGrad.addColorStop(1, adjustColor(theme.wallTop, -6));
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Chiseled cornice border stroke
    ctx.strokeStyle = adjustColor(theme.wallBorder, 20, 0.72);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Inner recessed stone core on top cap
    const inset = 0.66;
    ctx.beginPath();
    ctx.moveTo(cx, topY - hh * inset);
    ctx.lineTo(cx + hw * inset, topY);
    ctx.lineTo(cx, topY + hh * inset);
    ctx.lineTo(cx - hw * inset, topY);
    ctx.closePath();
    ctx.fillStyle = adjustColor(theme.wallLeft, -6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Diagonal miter joints on the stone cornice
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, topY - hh);
    ctx.lineTo(cx, topY - hh * inset);
    ctx.moveTo(cx + hw, topY);
    ctx.lineTo(cx + hw * inset, topY);
    ctx.moveTo(cx, topY + hh);
    ctx.lineTo(cx, topY + hh * inset);
    ctx.moveTo(cx - hw, topY);
    ctx.lineTo(cx - hw * inset, topY);
    ctx.stroke();

    return canvas;
  }

  private bakeTownInteriorFloorVariant(
    style: 'oak_planks' | 'stone_flag' | 'royal_carpet',
    variant: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const cy = 20;
    const hw = 32;
    const hh = 16;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle =
      style === 'oak_planks' ? '#45220e' : style === 'royal_carpet' ? '#4c1d24' : '#293241';
    ctx.fill();

    ctx.save();
    ctx.clip();

    if (style === 'oak_planks') {
      // Warm medieval tavern/cottage oak floorboards with wood grain and plank nails
      const planks = 4;
      for (let p = 0; p < planks; p++) {
        const u0 = p / planks;
        const u1 = (p + 1) / planks;
        const p0 = isoUV(cx, cy, u0, 0, hw, hh);
        const p1 = isoUV(cx, cy, u1, 0, hw, hh);
        const p2 = isoUV(cx, cy, u1, 1, hw, hh);
        const p3 = isoUV(cx, cy, u0, 1, hw, hh);
        const shade = ((p + variant) % 3) * 6 - 5;

        ctx.fillStyle = adjustColor('#6b3818', shade);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(28, 12, 4, 0.72)';
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // Cross plank joint
        const jointV = ((p * 3 + variant) % 3) * 0.25 + 0.25;
        const j0 = isoUV(cx, cy, u0, jointV, hw, hh);
        const j1 = isoUV(cx, cy, u1, jointV, hw, hh);
        ctx.beginPath();
        ctx.moveTo(j0.x, j0.y);
        ctx.lineTo(j1.x, j1.y);
        ctx.stroke();
      }
    } else if (style === 'royal_carpet') {
      // Ornate manor parquet + burgundy-gold woven runner
      const p0 = isoUV(cx, cy, 0.08, 0.08, hw, hh);
      const p1 = isoUV(cx, cy, 0.92, 0.08, hw, hh);
      const p2 = isoUV(cx, cy, 0.92, 0.92, hw, hh);
      const p3 = isoUV(cx, cy, 0.08, 0.92, hw, hh);
      ctx.fillStyle = variant % 2 === 0 ? '#691b26' : '#581620';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else {
      // Abbey / Forge / Keep interior stone brick masonry in a clean light shade
      this.renderStaggeredBrickTile(
        ctx,
        cx,
        cy,
        variant,
        '#383f4a',
        this.getReferenceGreyBrickPalettes()
      );
    }

    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.48)';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    return canvas;
  }

  private bakeTownWallVariant(variant: number): HTMLCanvasElement {
    // Medieval Half-Timbered Tudor & Stone Foundation Wall Block (inspired by reference sheets)
    // Lower course: rough-hewn medieval stone foundation
    // Upper stories: warm cream plaster with dark oak timber framing, cross-bracing & leaded casement windows
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const baseY = 74;
    const hw = 32;
    const hh = 16;
    const wallH = 54;
    const stoneH = 20; // Lower stone masonry plinth height

    // 1. Soft ground ambient occlusion skirt
    const aoGrad = ctx.createRadialGradient(cx, baseY + 4, 8, cx, baseY + 4, 35);
    aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
    aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aoGrad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 4, 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Left Face (South-West — illuminated face)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - hw, baseY);
    ctx.lineTo(cx, baseY + hh);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.lineTo(cx - hw, baseY - wallH);
    ctx.closePath();
    ctx.clip();

    // Upper Wattle & Daub Cream Plaster
    const plasterLeft = ctx.createLinearGradient(cx - hw, baseY - wallH, cx, baseY + hh - stoneH);
    plasterLeft.addColorStop(0, '#e7dcc8');
    plasterLeft.addColorStop(1, '#cbbba0');
    ctx.fillStyle = plasterLeft;
    ctx.fillRect(cx - hw, baseY - wallH - 4, hw, wallH + hh + 8);

    // Lower Stone Foundation Course
    const stoneLeft = ctx.createLinearGradient(cx - hw, baseY - stoneH, cx, baseY + hh);
    stoneLeft.addColorStop(0, '#64748b');
    stoneLeft.addColorStop(1, '#475569');
    ctx.fillStyle = stoneLeft;
    ctx.beginPath();
    ctx.moveTo(cx - hw, baseY);
    ctx.lineTo(cx, baseY + hh);
    ctx.lineTo(cx, baseY + hh - stoneH);
    ctx.lineTo(cx - hw, baseY - stoneH);
    ctx.closePath();
    ctx.fill();

    // Stone foundation mortar lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - hw, baseY - stoneH * 0.5);
    ctx.lineTo(cx, baseY + hh - stoneH * 0.5);
    ctx.moveTo(cx - hw * 0.5, baseY + hh * 0.5 - stoneH);
    ctx.lineTo(cx - hw * 0.5, baseY + hh * 0.5);
    ctx.stroke();

    // Dark Oak Timber Framing Beams on Left Face
    ctx.strokeStyle = '#3e2412';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    // Horizontal waist & top beams
    ctx.moveTo(cx - hw, baseY - stoneH);
    ctx.lineTo(cx, baseY + hh - stoneH);
    ctx.moveTo(cx - hw, baseY - wallH + 2);
    ctx.lineTo(cx, baseY + hh - wallH + 2);
    // Mid-story horizontal timber rail
    const midH = stoneH + (wallH - stoneH) * 0.52;
    ctx.moveTo(cx - hw, baseY - midH);
    ctx.lineTo(cx, baseY + hh - midH);
    // Vertical corner & center posts
    ctx.moveTo(cx - hw + 1.5, baseY - stoneH);
    ctx.lineTo(cx - hw + 1.5, baseY - wallH);
    ctx.moveTo(cx - hw * 0.5, baseY + hh * 0.5 - stoneH);
    ctx.lineTo(cx - hw * 0.5, baseY + hh * 0.5 - wallH);
    ctx.stroke();

    // Tudor Diagonal Cross-Bracing or Leaded Casement Window on Left Face
    if (variant % 3 === 1) {
      // Warm leaded medieval window with wooden shutters
      const wx = cx - hw * 0.5;
      const wy = baseY + hh * 0.5 - stoneH - 17;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#3e2412';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(wx - 5, wy - 7, 10, 12);
      ctx.fill();
      ctx.stroke();
      // Golden interior candle glow in window panes
      ctx.fillStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.fillRect(wx - 3.5, wy - 5.5, 3, 4.5);
      ctx.fillRect(wx + 0.5, wy - 5.5, 3, 4.5);
      ctx.fillRect(wx - 3.5, wy, 3, 4);
      ctx.fillRect(wx + 0.5, wy, 3, 4);
    } else {
      // Diagonal oak timber braces
      ctx.strokeStyle = '#4a2c17';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(cx - hw + 2, baseY - stoneH);
      ctx.lineTo(cx - hw * 0.5, baseY + hh * 0.5 - midH);
      ctx.moveTo(cx - 2, baseY + hh - stoneH);
      ctx.lineTo(cx - hw * 0.5, baseY + hh * 0.5 - midH);
      ctx.stroke();
    }

    ctx.restore();

    // 3. Right Face (South-East — shaded face)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh);
    ctx.lineTo(cx + hw, baseY);
    ctx.lineTo(cx + hw, baseY - wallH);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.closePath();
    ctx.clip();

    // Shaded Plaster on Right Face
    const plasterRight = ctx.createLinearGradient(cx, baseY - wallH, cx + hw, baseY + hh - stoneH);
    plasterRight.addColorStop(0, '#c2b297');
    plasterRight.addColorStop(1, '#9c8c73');
    ctx.fillStyle = plasterRight;
    ctx.fillRect(cx, baseY - wallH - 4, hw, wallH + hh + 8);

    // Lower Stone Foundation on Right Face
    const stoneRight = ctx.createLinearGradient(cx, baseY - stoneH, cx + hw, baseY + hh);
    stoneRight.addColorStop(0, '#475569');
    stoneRight.addColorStop(1, '#334155');
    ctx.fillStyle = stoneRight;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh);
    ctx.lineTo(cx + hw, baseY);
    ctx.lineTo(cx + hw, baseY - stoneH);
    ctx.lineTo(cx, baseY + hh - stoneH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh - stoneH * 0.5);
    ctx.lineTo(cx + hw, baseY - stoneH * 0.5);
    ctx.moveTo(cx + hw * 0.5, baseY + hh * 0.5 - stoneH);
    ctx.lineTo(cx + hw * 0.5, baseY + hh * 0.5);
    ctx.stroke();

    // Dark Oak Timber Beams on Right Face
    const midHR = stoneH + (wallH - stoneH) * 0.52;
    ctx.strokeStyle = '#2d1a0c';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh - stoneH);
    ctx.lineTo(cx + hw, baseY - stoneH);
    ctx.moveTo(cx, baseY + hh - wallH + 2);
    ctx.lineTo(cx + hw, baseY - wallH + 2);
    ctx.moveTo(cx, baseY + hh - midHR);
    ctx.lineTo(cx + hw, baseY - midHR);
    ctx.moveTo(cx + hw - 1.5, baseY - stoneH);
    ctx.lineTo(cx + hw - 1.5, baseY - wallH);
    ctx.moveTo(cx + hw * 0.5, baseY + hh * 0.5 - stoneH);
    ctx.lineTo(cx + hw * 0.5, baseY + hh * 0.5 - wallH);
    ctx.stroke();

    if (variant % 3 === 2) {
      const wx = cx + hw * 0.5;
      const wy = baseY + hh * 0.5 - stoneH - 17;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#2d1a0c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(wx - 5, wy - 7, 10, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.68)';
      ctx.fillRect(wx - 3.5, wy - 5.5, 3, 4.5);
      ctx.fillRect(wx + 0.5, wy - 5.5, 3, 4.5);
      ctx.fillRect(wx - 3.5, wy, 3, 4);
      ctx.fillRect(wx + 0.5, wy, 3, 4);
    } else {
      ctx.strokeStyle = '#3b2210';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(cx + 2, baseY + hh - stoneH);
      ctx.lineTo(cx + hw * 0.5, baseY + hh * 0.5 - midHR);
      ctx.moveTo(cx + hw - 2, baseY - stoneH);
      ctx.lineTo(cx + hw * 0.5, baseY + hh * 0.5 - midHR);
      ctx.stroke();
    }

    ctx.restore();

    // 4. Center Vertical Oak Corner Post Spine
    ctx.strokeStyle = '#2d1a0c';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx, baseY + hh);
    ctx.lineTo(cx, baseY + hh - wallH);
    ctx.stroke();

    // 5. Top Timber Wall Plate & Shingle Cap
    const topY = baseY - wallH;
    ctx.beginPath();
    ctx.moveTo(cx, topY - hh);
    ctx.lineTo(cx + hw, topY);
    ctx.lineTo(cx, topY + hh);
    ctx.lineTo(cx - hw, topY);
    ctx.closePath();
    ctx.fillStyle = '#4a2c17';
    ctx.fill();
    ctx.strokeStyle = '#2d1a0c';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const inset = 0.68;
    ctx.beginPath();
    ctx.moveTo(cx, topY - hh * inset);
    ctx.lineTo(cx + hw * inset, topY);
    ctx.lineTo(cx, topY + hh * inset);
    ctx.lineTo(cx - hw * inset, topY);
    ctx.closePath();
    ctx.fillStyle = '#6b3e20';
    ctx.fill();

    return canvas;
  }

  private bakeTownWaterVariant(isDeep: boolean, variant: number, frame = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const cy = 20;
    const hw = 33.4;
    const hh = 16.7;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();

    // Rich fantasy pond/river teal-cerulean base (Reference Images 2, 5, 6)
    ctx.fillStyle = isDeep ? '#116985' : '#18829e';
    ctx.fill();

    ctx.save();
    ctx.clip();

    const phase = (frame / 4) * Math.PI * 2;
    const flowShift = ((frame / 4) * 16 + variant * 4) % 16;

    // 1. Drifting Cel-Shaded Sub-Surface Aqua Swells (Reference Images 1, 3, 4)
    ctx.fillStyle = isDeep ? 'rgba(28, 163, 196, 0.34)' : 'rgba(56, 189, 248, 0.36)';
    ctx.beginPath();
    ctx.ellipse(cx - 10 + flowShift, cy - 3, 13, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 8 - flowShift * 0.8, cy + 4, 11, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Shimmering Horizontal Water Reflection Bands (Reference Images 2, 5, 6)
    const shimmerRows = [
      { oy: -8, bx: -8, w: 12, p: 0.0 },
      { oy: -4.5, bx: 4, w: 15, p: 1.4 },
      { oy: -1, bx: -11, w: 14, p: 2.8 },
      { oy: 2.5, bx: 2, w: 16, p: 4.1 },
      { oy: 6, bx: -6, w: 11, p: 5.3 },
    ];

    ctx.lineCap = 'round';
    for (let i = 0; i < shimmerRows.length; i++) {
      const sr = shimmerRows[i];
      const waveX = cx + sr.bx + Math.sin(phase + sr.p + variant * 1.2) * 4.5;
      const halfSpan = (sr.w + Math.cos(phase + sr.p) * 3.0) * 0.5;

      // Mid-cyan reflection band
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.58)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(waveX - halfSpan, cy + sr.oy);
      ctx.lineTo(waveX + halfSpan, cy + sr.oy);
      ctx.stroke();

      // Bright ice-white specular core streak (Reference Image 2 & 5)
      if ((i + variant) % 2 === 0) {
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.82)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(waveX - halfSpan * 0.55, cy + sr.oy - 0.3);
        ctx.lineTo(waveX + halfSpan * 0.55, cy + sr.oy - 0.3);
        ctx.stroke();
      }
    }

    // 3. Stylized Cel-Shaded Flowing Wave Crest & Foam Droplets (Reference Images 1 & 4)
    const crestX = cx - 14 + ((frame * 3.5 + variant * 7) % 28);
    const crestY = cy + (variant % 2 === 0 ? -2.5 : 2.5) + Math.sin(phase) * 1.5;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.78)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(crestX - 6, crestY + 1);
    ctx.quadraticCurveTo(crestX, crestY - 2.2, crestX + 6, crestY + 0.6);
    ctx.stroke();

    // Floating notched emerald Lily Pad & Pink Lotus Blossom on variant 3 (Reference Images 2, 5, 6)
    if (!isDeep && variant === 3) {
      const lx = cx + 4 + Math.sin(phase) * 1.1;
      const ly = cy + 2;
      // Water ripple ring under lily pad
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 0.5, 8.2, 4.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Notched emerald lily pad leaf
      ctx.fillStyle = '#228b22';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 6.5, 3.4, 0.1, 0.28, Math.PI * 1.92);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(lx - 0.8, ly - 0.3, 4.2, 2.1, 0.1, 0.35, Math.PI * 1.85);
      ctx.lineTo(lx - 0.8, ly - 0.3);
      ctx.closePath();
      ctx.fill();

      // Multi-petal pink lotus blossom (Reference Images 2, 5, 6)
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(lx - 0.5, ly - 1.5, 2.8, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(lx - 0.5, ly - 2.0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx - 0.5, ly - 2.1, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return canvas;
  }

  private bakeFountainFrame(frame: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 148;
    canvas.height = 132;
    const ctx = canvas.getContext('2d')!;
    const x = 74;
    const y = 92;
    const phase = (frame / 4) * Math.PI * 2;
    const flowFrac = frame / 4;

    // 1. Soft Ground Drop Shadow
    ctx.fillStyle = 'rgba(15, 20, 28, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 63, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer Stepped Circular Stone Base Plinth (3D front lip + radial chiseled stone blocks)
    const apronRx = 56;
    const apronRy = 27.5;
    const apronDrop = 5;

    // 3D front face of the stepped outer base ring
    const apronWallGrad = ctx.createLinearGradient(x - apronRx, y, x + apronRx, y + apronDrop);
    apronWallGrad.addColorStop(0, '#6c757d');
    apronWallGrad.addColorStop(0.5, '#565e66');
    apronWallGrad.addColorStop(1, '#3d434a');
    ctx.fillStyle = apronWallGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, apronRx, apronRy, 0, 0, Math.PI);
    ctx.lineTo(x - apronRx, y + 3 + apronDrop);
    ctx.ellipse(x, y + 3 + apronDrop, apronRx, apronRy, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Top face of the outer stepped stone base ring
    ctx.fillStyle = '#8b949e';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, apronRx, apronRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radial ashlar block joints & vertical front joints on outer base step
    ctx.strokeStyle = '#2b3036';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      ctx.moveTo(x + cosA * 44, y + 3 + sinA * 21.5);
      ctx.lineTo(x + cosA * apronRx, y + 3 + sinA * apronRy);
      if (sinA > 0.05) {
        ctx.moveTo(x + cosA * apronRx, y + 3 + sinA * apronRy);
        ctx.lineTo(x + cosA * apronRx, y + 3 + sinA * apronRy + apronDrop);
      }
    }
    ctx.stroke();

    // 3. Tall 2-Course Cylindrical Ashlar Stone Basin Wall (Matching reference image)
    const basinRx = 47;
    const basinRy = 22.5;
    const wallDrop = 14;
    const rimY = y - 10;

    // Cylindrical stone wall body (lit left, mid center, shaded right)
    const wallGrad = ctx.createLinearGradient(x - basinRx, rimY, x + basinRx, rimY + wallDrop);
    wallGrad.addColorStop(0, '#9fa8b2');
    wallGrad.addColorStop(0.32, '#868f98');
    wallGrad.addColorStop(0.7, '#646d75');
    wallGrad.addColorStop(1, '#484f56');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.ellipse(x, rimY, basinRx, basinRy, 0, 0, Math.PI);
    ctx.lineTo(x - basinRx, rimY + wallDrop);
    ctx.ellipse(x, rimY + wallDrop, basinRx, basinRy, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Horizontal middle mortar seam dividing the basin wall into 2 stacked courses of stone blocks
    ctx.strokeStyle = '#2b3036';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, rimY + wallDrop * 0.52, basinRx, basinRy, 0, 0.04 * Math.PI, 0.96 * Math.PI);
    ctx.stroke();

    // Sunlit top bevel along lower stone course
    ctx.strokeStyle = 'rgba(222, 226, 230, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(x, rimY + wallDrop * 0.52 + 1.1, basinRx - 1, basinRy - 0.5, 0, 0.12 * Math.PI, 0.72 * Math.PI);
    ctx.stroke();

    // Staggered vertical stone joints for upper and lower courses
    ctx.strokeStyle = '#2b3036';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const aTop = (i / 8) * Math.PI;
      const jx1 = x + Math.cos(aTop) * basinRx;
      const jy1 = rimY + Math.sin(aTop) * basinRy;
      ctx.moveTo(jx1, jy1);
      ctx.lineTo(jx1, jy1 + wallDrop * 0.52);

      const aBot = ((i + 0.5) / 8) * Math.PI;
      if (aBot < Math.PI * 0.94) {
        const jx2 = x + Math.cos(aBot) * basinRx;
        const jy2 = rimY + Math.sin(aBot) * basinRy + wallDrop * 0.52;
        ctx.moveTo(jx2, jy2);
        ctx.lineTo(jx2, jy2 + wallDrop * 0.48);
      }
    }
    ctx.stroke();

    // Creeping Emerald Moss & Wildflowers Around Stone Basin Base (Pink, Yellow, White, Blue)
    const mossClusters = [
      { angle: 0.18 * Math.PI, r: 4.5, flower: '#38bdf8' },
      { angle: 0.34 * Math.PI, r: 5.5, flower: '#facc15' },
      { angle: 0.44 * Math.PI, r: 4.8, flower: '#f8fafc' },
      { angle: 0.62 * Math.PI, r: 5.2, flower: '#fb923c' },
      { angle: 0.78 * Math.PI, r: 5.8, flower: '#f472b6' },
      { angle: 0.88 * Math.PI, r: 4.4, flower: '#f472b6' },
    ];
    for (const mc of mossClusters) {
      const mx = x + Math.cos(mc.angle) * (basinRx + 1);
      const my = rimY + Math.sin(mc.angle) * (basinRy + 1) + wallDrop - 1;
      // Dark foliage shadow
      ctx.fillStyle = '#1e5616';
      ctx.beginPath();
      ctx.ellipse(mx, my + 1, mc.r * 1.45, mc.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // Mid leaf green
      ctx.fillStyle = '#409628';
      ctx.beginPath();
      ctx.ellipse(mx, my, mc.r * 1.15, mc.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bright lime moss highlight
      ctx.fillStyle = '#7ad43b';
      ctx.beginPath();
      ctx.arc(mx - 1.5, my - 0.8, mc.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Tiny colorful flower blossom
      ctx.fillStyle = mc.flower;
      ctx.beginPath();
      ctx.arc(mx + 1.2, my - 0.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(mx + 1.2, my - 0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Wide Carved Stone Coping Rim at Top of Main Basin
    // 3D outer lip thickness of coping rim
    ctx.fillStyle = '#6c757d';
    ctx.beginPath();
    ctx.ellipse(x, rimY + 2.5, basinRx + 1.5, basinRy + 0.8, 0, 0, Math.PI);
    ctx.ellipse(x, rimY, basinRx + 1.5, basinRy + 0.8, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();

    const copingGrad = ctx.createLinearGradient(x - basinRx, rimY - basinRy, x + basinRx, rimY + basinRy);
    copingGrad.addColorStop(0, '#ced4da');
    copingGrad.addColorStop(0.5, '#adb5bd');
    copingGrad.addColorStop(1, '#7d858d');
    ctx.fillStyle = copingGrad;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, rimY, basinRx + 1.5, basinRy + 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radial stone coping block joints
    ctx.strokeStyle = '#343a40';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * 37.5, rimY + Math.sin(a) * 17.5);
      ctx.lineTo(x + Math.cos(a) * (basinRx + 1), rimY + Math.sin(a) * (basinRy + 0.5));
    }
    ctx.stroke();

    // Moss patches draped on the stone coping rim
    ctx.fillStyle = '#409628';
    ctx.beginPath();
    ctx.ellipse(x - 31, rimY + 12, 4.5, 2.2, 0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 28, rimY + 13, 4.0, 2.0, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 3, rimY + 20, 3.8, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ad43b';
    ctx.beginPath();
    ctx.ellipse(x - 31.5, rimY + 11.5, 2.6, 1.2, 0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 27.5, rimY + 12.5, 2.4, 1.1, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner stone basin wall visible above water surface
    const poolRx = 38;
    const poolRy = 18;
    ctx.fillStyle = '#495057';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, rimY, poolRx, poolRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Luminous Crystal-Blue Pool Water & White-Cyan Rim Foam
    const waterGrad = ctx.createRadialGradient(x, rimY + 1, 4, x, rimY + 1, poolRx);
    waterGrad.addColorStop(0, '#7dd3fc');
    waterGrad.addColorStop(0.45, '#29b6f6');
    waterGrad.addColorStop(0.82, '#0288d1');
    waterGrad.addColorStop(1, '#01579b');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(x, rimY + 1.5, poolRx - 1, poolRy - 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright white-cyan water edge foam ring around the inside of the pool
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, rimY + 1.5, poolRx - 2.2, poolRy - 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Expanding concentric cyan-white surface ripples
    for (let ring = 0; ring < 2; ring++) {
      const prog = (flowFrac + ring * 0.5) % 1;
      const rRx = 14 + prog * 21;
      const rRy = 6.5 + prog * 9.5;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - prog) * 0.75})`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.ellipse(x, rimY + 2, rRx, rRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Lower Central Stone Pedestal & Middle Scalloped Stone Bowl
    const midY = rimY - 22;
    const midRx = 22;
    const midRy = 10.5;

    // Pedestal base splash ring in lower pool
    ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
    ctx.beginPath();
    ctx.ellipse(x, rimY + 2, 12, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower stone pedestal column
    const pedGrad = ctx.createLinearGradient(x - 9, midY, x + 9, rimY);
    pedGrad.addColorStop(0, '#9fa8b2');
    pedGrad.addColorStop(0.5, '#6c757d');
    pedGrad.addColorStop(1, '#3d434a');
    ctx.fillStyle = pedGrad;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 8.5, midY + 6);
    ctx.lineTo(x - 10, rimY + 1);
    ctx.quadraticCurveTo(x, rimY + 5, x + 10, rimY + 1);
    ctx.lineTo(x + 8.5, midY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Middle Stone Bowl 3D Curved Underside
    const midUnderGrad = ctx.createLinearGradient(x - midRx, midY, x + midRx, midY + 9);
    midUnderGrad.addColorStop(0, '#868f98');
    midUnderGrad.addColorStop(0.5, '#5c646c');
    midUnderGrad.addColorStop(1, '#3b4046');
    ctx.fillStyle = midUnderGrad;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, midY, midRx, midRy, 0, 0, Math.PI);
    ctx.quadraticCurveTo(x + midRx * 0.75, midY + 17, x, midY + 17);
    ctx.quadraticCurveTo(x - midRx * 0.75, midY + 17, x - midRx, midY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Middle Stone Bowl Coping Rim
    ctx.fillStyle = '#adb5bd';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, midY, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Middle Bowl Bright Cyan Water Pool
    ctx.fillStyle = '#29b6f6';
    ctx.beginPath();
    ctx.ellipse(x, midY, midRx - 4, midRy - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 7. Two Distinct Wide Symmetrical Waterfall Curtains from Middle Bowl into Main Pool (Matching image.png)
    const lowerStreams = [
      { ox: -13.5, topY: midY + 6.5, botY: rimY + 4.5, w: 6.5 },
      { ox: 13.5, topY: midY + 6.5, botY: rimY + 4.5, w: 6.5 },
    ];
    for (let sIdx = 0; sIdx < lowerStreams.length; sIdx++) {
      const st = lowerStreams[sIdx];
      const sx = x + st.ox;

      // Splash ring in lower pool where waterfall lands
      const splashRx = 8.5 + Math.sin(phase + sIdx) * 1.2;
      const splashRy = 4.2 + Math.sin(phase + sIdx) * 0.6;
      ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.beginPath();
      ctx.ellipse(sx, st.botY, splashRx * 1.25, splashRy * 1.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(sx, st.botY, splashRx, splashRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Main translucent sky-cyan waterfall ribbon body
      const fallGrad = ctx.createLinearGradient(sx - st.w * 0.5, st.topY, sx + st.w * 0.5, st.botY);
      fallGrad.addColorStop(0, '#e0f2fe');
      fallGrad.addColorStop(0.25, '#38bdf8');
      fallGrad.addColorStop(0.8, '#0284c7');
      fallGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = fallGrad;
      ctx.beginPath();
      ctx.moveTo(sx - st.w * 0.48, st.topY - 1);
      ctx.quadraticCurveTo(sx, st.topY - 3, sx + st.w * 0.48, st.topY - 1);
      ctx.lineTo(sx + st.w * 0.56, st.botY);
      ctx.quadraticCurveTo(sx, st.botY + 2.5, sx - st.w * 0.56, st.botY);
      ctx.closePath();
      ctx.fill();

      // Animated vertical white foam stripes scrolling down the ribbon waterfall
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      const stripeShift = (flowFrac * 12) % 6;
      ctx.beginPath();
      ctx.moveTo(sx - 1.6, st.topY + stripeShift * 0.4);
      ctx.lineTo(sx - 1.8, st.botY - 1);
      ctx.moveTo(sx + 1.6, st.topY + ((stripeShift + 3) % 6) * 0.4);
      ctx.lineTo(sx + 1.8, st.botY - 1);
      ctx.stroke();

      // Frothy white foam crest at the lip of the middle bowl & base impact
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(sx, st.topY - 1, st.w * 0.48, 2.0, 0, 0, Math.PI * 2);
      ctx.ellipse(sx, st.botY, st.w * 0.62, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Upper Pedestal, Upper Carved Bowl & Conical Acorn Stone Spire Finial
    const topBowlY = midY - 18;
    const topRx = 13.5;
    const topRy = 6.5;

    // Upper stone pedestal column
    ctx.fillStyle = '#6c757d';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x - 5.5, topBowlY + 4);
    ctx.lineTo(x - 6.5, midY + 1);
    ctx.quadraticCurveTo(x, midY + 3.5, x + 6.5, midY + 1);
    ctx.lineTo(x + 5.5, topBowlY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Upper Bowl 3D Curved Underside
    ctx.fillStyle = '#5c646c';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, topBowlY, topRx, topRy, 0, 0, Math.PI);
    ctx.quadraticCurveTo(x + topRx * 0.7, topBowlY + 10.5, x, topBowlY + 10.5);
    ctx.quadraticCurveTo(x - topRx * 0.7, topBowlY + 10.5, x - topRx, topBowlY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Upper Bowl Stone Rim & Cyan Water
    ctx.fillStyle = '#ced4da';
    ctx.beginPath();
    ctx.ellipse(x, topBowlY, topRx, topRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(x, topBowlY, topRx - 3, topRy - 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Two Upper Symmetrical Waterfall Ribbons pouring into Middle Bowl
    const upperStreams = [
      { ox: -7.8, topY: topBowlY + 3.8, botY: midY + 1.5, w: 4.4 },
      { ox: 7.8, topY: topBowlY + 3.8, botY: midY + 1.5, w: 4.4 },
    ];
    for (const ust of upperStreams) {
      const ux = x + ust.ox;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(ux - ust.w * 0.45, ust.topY - 0.5);
      ctx.lineTo(ux + ust.w * 0.45, ust.topY - 0.5);
      ctx.lineTo(ux + ust.w * 0.52, ust.botY);
      ctx.lineTo(ux - ust.w * 0.52, ust.botY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(ux, ust.topY);
      ctx.lineTo(ux, ust.botY);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ux, ust.botY, 4.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Pointed Conical / Acorn Stone Finial Spire at the Crown (Matching reference image)
    const finialBaseY = topBowlY - 1;
    const finialTipY = topBowlY - 19;

    // Carved stone collar ring at base of finial
    ctx.fillStyle = '#adb5bd';
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, finialBaseY, 6.2, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pointed conical acorn spire body
    const finialGrad = ctx.createLinearGradient(x - 6, finialTipY, x + 6, finialBaseY);
    finialGrad.addColorStop(0, '#e9ecef');
    finialGrad.addColorStop(0.45, '#adb5bd');
    finialGrad.addColorStop(1, '#495057');
    ctx.fillStyle = finialGrad;
    ctx.beginPath();
    ctx.moveTo(x, finialTipY);
    ctx.quadraticCurveTo(x + 6.5, finialBaseY - 7, x + 5.2, finialBaseY - 1);
    ctx.quadraticCurveTo(x, finialBaseY + 1.8, x - 5.2, finialBaseY - 1);
    ctx.quadraticCurveTo(x - 6.5, finialBaseY - 7, x, finialTipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp sunlit left bevel on conical finial
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x - 0.5, finialTipY + 2);
    ctx.quadraticCurveTo(x - 4.2, finialBaseY - 7, x - 3.5, finialBaseY - 2);
    ctx.stroke();

    // 10. Signature 4-Point Diamond Star Sparkles (✦) Floating on the Pool Surface (Matching image.png)
    const drawStarSparkle = (sx: number, sy: number, size: number) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx, sy - size);
      ctx.quadraticCurveTo(sx + size * 0.22, sy - size * 0.22, sx + size, sy);
      ctx.quadraticCurveTo(sx + size * 0.22, sy + size * 0.22, sx, sy + size);
      ctx.quadraticCurveTo(sx - size * 0.22, sy + size * 0.22, sx - size, sy);
      ctx.quadraticCurveTo(sx - size * 0.22, sy - size * 0.22, sx, sy - size);
      ctx.closePath();
      ctx.fill();
    };

    const sPulse1 = 2.6 + Math.sin(phase) * 0.9;
    const sPulse2 = 2.4 + Math.cos(phase) * 0.9;
    drawStarSparkle(x - 24, rimY - 3, sPulse1);
    drawStarSparkle(x + 23, rimY - 2, sPulse2);
    drawStarSparkle(x - 5, rimY + 11, sPulse2 * 0.9);
    drawStarSparkle(x + 7, rimY + 9, sPulse1 * 0.85);
    drawStarSparkle(x - 25, rimY + 6, 1.9);

    return canvas;
  }

  private bakeTownTreeVariant(variant: number, swayFrame = 0): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 112;
    const ctx = canvas.getContext('2d')!;
    const x = 48;
    const y = 92;
    const scale = variant >= 4 ? 0.94 : 1.02;
    const species = variant % 4; // Matches the 4 trees in image.png: 0 = Grand Spreading Oak, 1 = Tall Woodland Dome Tree, 2 = Medium Meadow Tree, 3 = Young Forked Sapling
    const swayPhase = (swayFrame / 4) * Math.PI * 2;
    const baseSway = Math.sin(swayPhase) * 2.1 + Math.sin(swayPhase * 2 - 0.5) * 0.55;
    const crownBob = Math.cos(swayPhase * 2) * 0.75;

    // Helper: Draws a scalloped pixel-art-styled leaf cluster puff with dark underside, mid emerald body, and sunlit lime top lobes
    const drawScallopedFoliageCluster = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      tone: 'shadow' | 'mid' | 'bright' | 'crown',
      swayMul: number
    ) => {
      const scx = cx + baseSway * swayMul;
      const scy = cy + crownBob * swayMul * 0.55;

      const colors =
        tone === 'shadow'
          ? { outline: '#0b2607', bottom: '#11380b', body: '#1f5c14', top: '#317d1c' }
          : tone === 'mid'
          ? { outline: '#11360a', bottom: '#1b5211', body: '#378c1f', top: '#5eb82d' }
          : tone === 'bright'
          ? { outline: '#18470f', bottom: '#2b7319', body: '#52ad28', top: '#8ce03a' }
          : { outline: '#225914', bottom: '#3d8f22', body: '#7ad435', top: '#bef264' };

      // 1. Scalloped outer silhouette with 8 rounded leaf lobes
      const lobes = 8;
      ctx.beginPath();
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        const lx = scx + Math.cos(a) * rx * 0.64;
        const ly = scy + Math.sin(a) * ry * 0.64;
        const lr = (i % 2 === 0 ? 0.48 : 0.41) * Math.min(rx, ry * 1.3);
        ctx.moveTo(lx + lr, ly);
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      }
      ctx.moveTo(scx + rx * 0.72, scy);
      ctx.ellipse(scx, scy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);

      // Dark forest outline & underside shadow
      ctx.fillStyle = colors.bottom;
      ctx.fill();
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // 2. Main emerald leaf cluster body shifted slightly up-left toward the sun
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        if (Math.sin(a) > 0.65) continue; // Leave dark crescent on bottom-right underside
        const lx = scx - 0.5 + Math.cos(a) * rx * 0.58;
        const ly = scy - 1.2 + Math.sin(a) * ry * 0.58;
        const lr = (i % 2 === 0 ? 0.44 : 0.37) * Math.min(rx, ry * 1.25);
        ctx.moveTo(lx + lr, ly);
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      }
      ctx.moveTo(scx + rx * 0.64, scy - 1.2);
      ctx.ellipse(scx - 0.4, scy - 1.2, rx * 0.64, ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Sunlit top-left lime leaf puffs
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      ctx.arc(scx - rx * 0.25, scy - ry * 0.36, rx * 0.28, 0, Math.PI * 2);
      ctx.arc(scx + rx * 0.08, scy - ry * 0.42, rx * 0.25, 0, Math.PI * 2);
      ctx.arc(scx - rx * 0.42, scy - ry * 0.14, rx * 0.21, 0, Math.PI * 2);
      ctx.fill();
    };

    // Helper: Draws textured brown bark trunk with root flares & branches
    const drawBarkTrunk = (
      baseHalfW: number,
      topHalfW: number,
      trunkH: number,
      hasWideBoughs: boolean
    ) => {
      const bSway = baseSway * 0.45;
      const trunkGrad = ctx.createLinearGradient(x - baseHalfW, y, x + baseHalfW, y);
      trunkGrad.addColorStop(0, '#855835');
      trunkGrad.addColorStop(0.45, '#633e22');
      trunkGrad.addColorStop(1, '#3b2211');
      ctx.fillStyle = trunkGrad;
      ctx.strokeStyle = '#211208';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      // Left root buttress flare
      ctx.moveTo(x - baseHalfW * 1.45, y + 4);
      ctx.quadraticCurveTo(x - baseHalfW * 0.85, y - 2, x - topHalfW + bSway * 0.4, y - trunkH * 0.55);
      if (hasWideBoughs) {
        // Left spreading oak bough
        ctx.lineTo(x - baseHalfW * 2.1 + bSway, y - trunkH * 0.92);
        ctx.lineTo(x - baseHalfW * 1.55 + bSway, y - trunkH * 1.02);
        ctx.lineTo(x - topHalfW * 0.5 + bSway * 0.6, y - trunkH * 0.68);
        // Center-right spreading oak bough
        ctx.lineTo(x + topHalfW * 0.5 + bSway * 0.6, y - trunkH * 0.72);
        ctx.lineTo(x + baseHalfW * 1.65 + bSway, y - trunkH * 0.98);
        ctx.lineTo(x + baseHalfW * 2.15 + bSway, y - trunkH * 0.86);
      } else {
        ctx.lineTo(x - topHalfW * 1.35 + bSway, y - trunkH);
        ctx.lineTo(x + topHalfW * 1.35 + bSway, y - trunkH);
      }
      ctx.lineTo(x + topHalfW + bSway * 0.4, y - trunkH * 0.52);
      // Right root buttress flare
      ctx.quadraticCurveTo(x + baseHalfW * 0.85, y - 2, x + baseHalfW * 1.45, y + 4);
      // Center root toes gripping the ground
      ctx.quadraticCurveTo(x + baseHalfW * 0.45, y + 1, x + baseHalfW * 0.2, y + 5.5);
      ctx.quadraticCurveTo(x, y + 2, x - baseHalfW * 0.25, y + 5.5);
      ctx.quadraticCurveTo(x - baseHalfW * 0.5, y + 1, x - baseHalfW * 1.45, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vertical bark ridges & shadow crevices
      ctx.strokeStyle = 'rgba(33, 18, 8, 0.65)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - baseHalfW * 0.35, y + 3);
      ctx.quadraticCurveTo(x - topHalfW * 0.2, y - trunkH * 0.35, x - topHalfW * 0.5 + bSway * 0.5, y - trunkH * 0.7);
      ctx.moveTo(x + baseHalfW * 0.25, y + 3);
      ctx.quadraticCurveTo(x + topHalfW * 0.2, y - trunkH * 0.35, x + topHalfW * 0.4 + bSway * 0.5, y - trunkH * 0.68);
      ctx.stroke();
    };

    // 1. Dappled Ground Shadow & Grass Tuft at Root Base
    const shadowRx = (species === 0 ? 37 : species === 3 ? 21 : 29) * scale;
    const shadowRy = shadowRx * 0.48;
    const shadowGrad = ctx.createRadialGradient(x + 2, y + 3, 3, x + 2, y + 3, shadowRx);
    shadowGrad.addColorStop(0, 'rgba(12, 24, 14, 0.55)');
    shadowGrad.addColorStop(0.65, 'rgba(15, 32, 18, 0.26)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x + 2 + baseSway * 0.2, y + 3, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();

    if (species === 0) {
      // ARCHETYPE 0: Grand Spreading Ancient Oak (Top-Left large tree in image.png)
      // Back shadow foliage layer behind upper boughs
      drawScallopedFoliageCluster(x - 21 * scale, y - 34 * scale, 16 * scale, 11 * scale, 'shadow', 0.65);
      drawScallopedFoliageCluster(x + 21 * scale, y - 33 * scale, 16 * scale, 11 * scale, 'shadow', 0.65);
      drawScallopedFoliageCluster(x, y - 31 * scale, 20 * scale, 12 * scale, 'shadow', 0.6);

      // Thick gnarled oak trunk with wide spreading boughs & root buttresses
      drawBarkTrunk(9.5 * scale, 5.8 * scale, 38 * scale, true);

      // Mid-canopy billowing emerald clusters
      drawScallopedFoliageCluster(x - 24 * scale, y - 42 * scale, 16 * scale, 11.5 * scale, 'mid', 0.85);
      drawScallopedFoliageCluster(x + 23 * scale, y - 41 * scale, 16 * scale, 11.5 * scale, 'mid', 0.85);
      drawScallopedFoliageCluster(x - 9 * scale, y - 38 * scale, 17 * scale, 12 * scale, 'mid', 0.8);
      drawScallopedFoliageCluster(x + 10 * scale, y - 37 * scale, 17 * scale, 12 * scale, 'mid', 0.8);

      // Upper-mid bright green leaf clusters
      drawScallopedFoliageCluster(x - 16 * scale, y - 52 * scale, 16 * scale, 11.5 * scale, 'bright', 1.05);
      drawScallopedFoliageCluster(x + 15 * scale, y - 51 * scale, 16 * scale, 11.5 * scale, 'bright', 1.05);
      drawScallopedFoliageCluster(x, y - 49 * scale, 18 * scale, 12.5 * scale, 'bright', 1.0);

      // Sunlit golden-lime crown clusters at the top of the oak
      drawScallopedFoliageCluster(x - 6 * scale, y - 61 * scale, 15 * scale, 10.5 * scale, 'crown', 1.25);
      drawScallopedFoliageCluster(x + 7 * scale, y - 59 * scale, 14 * scale, 10 * scale, 'crown', 1.25);
    } else if (species === 1) {
      // ARCHETYPE 1: Tall Rounded Woodland Tree (Top-Right medium-tall tree in image.png)
      drawScallopedFoliageCluster(x, y - 32 * scale, 21 * scale, 12 * scale, 'shadow', 0.6);
      drawBarkTrunk(7.2 * scale, 4.5 * scale, 40 * scale, false);

      // Lower-mid wide green skirt
      drawScallopedFoliageCluster(x - 13 * scale, y - 37 * scale, 15 * scale, 11 * scale, 'mid', 0.75);
      drawScallopedFoliageCluster(x + 13 * scale, y - 36 * scale, 15 * scale, 11 * scale, 'mid', 0.75);
      drawScallopedFoliageCluster(x, y - 35 * scale, 16 * scale, 11.5 * scale, 'mid', 0.75);

      // Middle dome tier
      drawScallopedFoliageCluster(x - 10 * scale, y - 48 * scale, 15 * scale, 11 * scale, 'bright', 1.0);
      drawScallopedFoliageCluster(x + 10 * scale, y - 47 * scale, 15 * scale, 11 * scale, 'bright', 1.0);
      drawScallopedFoliageCluster(x, y - 46 * scale, 16 * scale, 11.5 * scale, 'bright', 0.95);

      // High sunlit lime dome crown
      drawScallopedFoliageCluster(x - 4 * scale, y - 59 * scale, 14 * scale, 10.5 * scale, 'crown', 1.25);
      drawScallopedFoliageCluster(x + 5 * scale, y - 57 * scale, 13 * scale, 9.5 * scale, 'crown', 1.2);
      drawScallopedFoliageCluster(x, y - 65 * scale, 11 * scale, 8.5 * scale, 'crown', 1.35);
    } else if (species === 2) {
      // ARCHETYPE 2: Compact Meadow Shade Tree (Bottom-Left medium tree in image.png)
      drawScallopedFoliageCluster(x, y - 28 * scale, 19 * scale, 11 * scale, 'shadow', 0.55);
      drawBarkTrunk(6.5 * scale, 4.0 * scale, 34 * scale, true);

      drawScallopedFoliageCluster(x - 12 * scale, y - 34 * scale, 14.5 * scale, 10.5 * scale, 'mid', 0.8);
      drawScallopedFoliageCluster(x + 12 * scale, y - 33 * scale, 14.5 * scale, 10.5 * scale, 'mid', 0.8);
      drawScallopedFoliageCluster(x, y - 32 * scale, 15.5 * scale, 11 * scale, 'mid', 0.75);

      drawScallopedFoliageCluster(x - 8 * scale, y - 44 * scale, 14 * scale, 10 * scale, 'bright', 1.05);
      drawScallopedFoliageCluster(x + 8 * scale, y - 43 * scale, 14 * scale, 10 * scale, 'bright', 1.05);
      drawScallopedFoliageCluster(x, y - 51 * scale, 13.5 * scale, 9.5 * scale, 'crown', 1.2);
    } else {
      // ARCHETYPE 3: Young Forked Sapling Tree (Center-Left small tree in image.png with visible branches between leaf puffs)
      const bSway = baseSway * 0.5;
      // Airy back leaf cluster
      drawScallopedFoliageCluster(x + 8 * scale, y - 29 * scale, 10.5 * scale, 7.8 * scale, 'mid', 0.75);

      // Slender forked sapling trunk & visible upper branches
      ctx.strokeStyle = '#211208';
      ctx.lineWidth = 4.2 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.quadraticCurveTo(x - 1, y - 14 * scale, x + bSway * 0.4, y - 26 * scale);
      // Left branch
      ctx.moveTo(x + bSway * 0.3, y - 18 * scale);
      ctx.lineTo(x - 11 * scale + bSway * 0.8, y - 31 * scale);
      // Right branch
      ctx.moveTo(x + bSway * 0.35, y - 21 * scale);
      ctx.lineTo(x + 11 * scale + bSway * 0.8, y - 33 * scale);
      // Center-top branch
      ctx.moveTo(x + bSway * 0.4, y - 25 * scale);
      ctx.lineTo(x - 2 * scale + bSway, y - 40 * scale);
      ctx.stroke();

      ctx.strokeStyle = '#754929';
      ctx.lineWidth = 2.4 * scale;
      ctx.stroke();

      // Distinct airy leaf clusters on the forked sapling branches
      drawScallopedFoliageCluster(x - 11 * scale, y - 32 * scale, 11 * scale, 8.2 * scale, 'bright', 0.9);
      drawScallopedFoliageCluster(x + 10 * scale, y - 35 * scale, 10.5 * scale, 8 * scale, 'bright', 0.95);
      drawScallopedFoliageCluster(x - 1 * scale, y - 43 * scale, 11.5 * scale, 8.5 * scale, 'crown', 1.15);
    }

    return canvas;
  }

  /**
   * Pre-bakes all 16 N/E/S/W water shoreline foam & stone embankment bitmask overlays
   * (bit 0 = !nWater, bit 1 = !eWater, bit 2 = !sWater, bit 3 = !wWater) so shoreline water tiles
   * are drawn via O(1) SpriteBatcher blits instead of per-frame ctx.stroke() vector paths.
   */
  private bakeShorelineMaskSprite(mask: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    if (mask === 0) return canvas;

    const x = 36;
    const y = 20;
    const hw = 32;
    const hh = 16;

    const noN = (mask & 1) !== 0;
    const noE = (mask & 2) !== 0;
    const noS = (mask & 4) !== 0;
    const noW = (mask & 8) !== 0;

    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.78)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    if (noN) {
      ctx.moveTo(x, y - hh + 2.2);
      ctx.lineTo(x - hw + 4.2, y);
    }
    if (noE) {
      ctx.moveTo(x, y - hh + 2.2);
      ctx.lineTo(x + hw - 4.2, y);
    }
    if (noS) {
      ctx.moveTo(x + hw - 4.2, y);
      ctx.lineTo(x, y + hh - 2.2);
    }
    if (noW) {
      ctx.moveTo(x, y + hh - 2.2);
      ctx.lineTo(x - hw + 4.2, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#5c5449';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (noN) {
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x - hw, y);
    }
    if (noE) {
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x + hw, y);
    }
    if (noS) {
      ctx.moveTo(x + hw, y);
      ctx.lineTo(x, y + hh);
    }
    if (noW) {
      ctx.moveTo(x, y + hh);
      ctx.lineTo(x - hw, y);
    }
    ctx.stroke();

    return canvas;
  }

  /**
   * Pre-bakes all 16 N/E/S/W Minecraft-style 1/16th-block recessed grass-block step edges
   * (bit 0 = North is grass, bit 1 = East is grass, bit 2 = South is grass, bit 3 = West is grass)
   * so that dirt path blocks sit cleanly recessed below adjacent green grass blocks (Reference Image).
   */
  private bakeRoadGrassEdgeMaskSprite(mask: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    if (mask === 0) return canvas;

    const cx = 36;
    const cy = 20;
    const hw = 33.4;
    const hh = 16.7;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.clip();

    // Lush, Thick, Jagged/Tufted Bright-Green Grass Border Fringe (Matching the straight & crossroads paths in image.png)
    const drawTuftedGrassBorderEdge = (
      u0: number,
      v0: number,
      u1: number,
      v1: number,
      duIn: number,
      dvIn: number,
      isTopEdge: boolean,
      seedSalt: number
    ) => {
      const steps = 16;
      const baseRim = 0.145; // Thick, prominent lush grass border like image.png

      // 1. Warm Dark-Earth Undercut Shadow beneath the overhanging grass fringe
      const shadowDepth = baseRim * (isTopEdge ? 1.45 : 1.22);
      ctx.fillStyle = isTopEdge ? 'rgba(92, 60, 32, 0.72)' : 'rgba(102, 68, 38, 0.52)';
      ctx.beginPath();
      const pStart = isoUV(cx, cy, u0, v0, 33.2, 16.6);
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const h = spatialHash(i + seedSalt, mask, 911);
        const jag = ((h & 7) / 7) * 0.055;
        const d = shadowDepth + jag;
        const pt = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * d,
          v0 + (v1 - v0) * t + dvIn * d,
          33.2,
          16.6
        );
        ctx.lineTo(pt.x, pt.y + (isTopEdge ? 0.6 : 0));
      }
      const pEnd = isoUV(cx, cy, u1, v1, 33.2, 16.6);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.closePath();
      ctx.fill();

      // 2. Deep Forest-Green Jagged Turf Teeth Layer (#286918)
      ctx.fillStyle = '#286918';
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const h = spatialHash(i + seedSalt * 3, mask, 947);
        const tooth = (i % 2 === 0 ? 0.048 : -0.015) + ((h & 3) * 0.012);
        const d = baseRim * 1.08 + tooth;
        const pt = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * d,
          v0 + (v1 - v0) * t + dvIn * d,
          33.2,
          16.6
        );
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.closePath();
      ctx.fill();

      // 3. Vibrant Mid-Green Leafy Grass Fringe Body (#4ca828)
      ctx.fillStyle = '#4ca828';
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const h = spatialHash(i + seedSalt * 5, mask, 977);
        const tooth = (i % 2 === 0 ? 0.038 : -0.012) + ((h & 3) * 0.01);
        const d = baseRim * 0.82 + tooth;
        const pt = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * d,
          v0 + (v1 - v0) * t + dvIn * d,
          33.2,
          16.6
        );
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.closePath();
      ctx.fill();

      // 4. Sunlit Lime-Yellow Grass Crest & Pointed Blade Tips (#8ce03a)
      ctx.fillStyle = '#8ce03a';
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const tooth = i % 2 === 0 ? 0.025 : -0.008;
        const d = baseRim * 0.46 + tooth;
        const pt = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * d,
          v0 + (v1 - v0) * t + dvIn * d,
          33.2,
          16.6
        );
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.closePath();
      ctx.fill();

      // 5. Individual Crisp Grass Blades Jutting Over the Path Edge
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.1;
      for (let i = 1; i < steps; i += 2) {
        const t = i / steps;
        const h = spatialHash(i + seedSalt * 7, mask, 997);
        const bBase = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * (baseRim * 0.65),
          v0 + (v1 - v0) * t + dvIn * (baseRim * 0.65),
          33.2,
          16.6
        );
        const bTip = isoUV(
          cx,
          cy,
          u0 + (u1 - u0) * t + duIn * (baseRim * 1.25),
          v0 + (v1 - v0) * t + dvIn * (baseRim * 1.25),
          33.2,
          16.6
        );
        ctx.strokeStyle = (h & 1) === 0 ? '#8ce03a' : '#53b028';
        ctx.beginPath();
        ctx.moveTo(bBase.x, bBase.y);
        ctx.lineTo(bTip.x, bTip.y - 0.8);
        ctx.stroke();
      }
    };

    // North neighbor (ty - 1): v = 0 edge (u from 0 to 1, inward is +v)
    if ((mask & 1) !== 0) {
      drawTuftedGrassBorderEdge(0, 0, 1, 0, 0, 1, true, 13);
    }
    // East neighbor (tx + 1): u = 1 edge (v from 0 to 1, inward is -u)
    if ((mask & 2) !== 0) {
      drawTuftedGrassBorderEdge(1, 0, 1, 1, -1, 0, true, 29);
    }
    // South neighbor (ty + 1): v = 1 edge (u from 0 to 1, inward is -v)
    if ((mask & 4) !== 0) {
      drawTuftedGrassBorderEdge(0, 1, 1, 1, 0, -1, false, 47);
    }
    // West neighbor (tx - 1): u = 0 edge (v from 0 to 1, inward is +u)
    if ((mask & 8) !== 0) {
      drawTuftedGrassBorderEdge(0, 0, 0, 1, 1, 0, false, 61);
    }

    ctx.restore();
    return canvas;
  }

  private bakeVoidBedrockSprite(theme: DungeonThemeConfig, variant: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const x = 36;
    const y = 20;
    const hw = 32;
    const hh = 16;

    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = (variant & 1) === 0 ? '#060911' : '#080c16';
    ctx.fill();

    if (variant === 0) {
      ctx.strokeStyle = theme.wallLeft;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 8, y - 4);
      ctx.stroke();
    }
    return canvas;
  }
}
