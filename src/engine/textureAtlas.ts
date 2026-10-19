import { DungeonThemeConfig } from './world';

export interface SpriteAtlasRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
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

export class TileAtlasBank {
  private cache = new Map<string, BakedThemeAtlas>();
  private canUseDOMCanvas: boolean;

  constructor() {
    this.canUseDOMCanvas =
      typeof document !== 'undefined' && typeof document.createElement === 'function';
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

    const masterSheet = document.createElement('canvas');
    masterSheet.width = 1024;
    masterSheet.height = 2048;

    const baked: BakedThemeAtlas = {
      themeId: theme.id,
      masterSheet,
      rectMap: new WeakMap<HTMLCanvasElement, SpriteAtlasRect>(),
      floorSprites: [],
      wallSprites: [],
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
      shorelineSprites: [],
      voidBedrockSprites: [],
    };

    for (let v = 0; v < 16; v++) {
      baked.floorSprites.push(this.bakeDungeonFloorVariant(theme, v));
      baked.shorelineSprites.push(this.bakeShorelineMaskSprite(v));
    }
    for (let v = 0; v < 4; v++) {
      baked.voidBedrockSprites.push(this.bakeVoidBedrockSprite(theme, v));
    }
    for (let v = 0; v < 8; v++) {
      baked.wallSprites.push(this.bakeDungeonWallVariant(theme, v));
    }
    for (let v = 0; v < 8; v++) {
      baked.townRoadSprites.push(this.bakeTownFloorVariant(true, v, 0));
      baked.townGrassSprites.push(this.bakeTownFloorVariant(false, v, 0));
    }
    for (let f = 0; f < 6; f++) {
      const grassFrameRow: HTMLCanvasElement[] = [];
      const treeFrameRow: HTMLCanvasElement[] = [];
      for (let v = 0; v < 8; v++) {
        grassFrameRow.push(this.bakeTownFloorVariant(false, v, f));
        treeFrameRow.push(this.bakeTownTreeVariant(v, f));
      }
      baked.townGrassFrames.push(grassFrameRow);
      baked.townTreeFrames.push(treeFrameRow);
    }
    for (let v = 0; v < 4; v++) {
      baked.townInteriorWoodSprites.push(this.bakeTownInteriorFloorVariant('oak_planks', v));
      baked.townInteriorStoneSprites.push(this.bakeTownInteriorFloorVariant('stone_flag', v));
      baked.townInteriorCarpetSprites.push(this.bakeTownInteriorFloorVariant('royal_carpet', v));
      baked.townWaterShallowSprites.push(this.bakeTownWaterVariant(false, v, 0));
      baked.townWaterDeepSprites.push(this.bakeTownWaterVariant(true, v, 0));
    }
    for (let f = 0; f < 8; f++) {
      const shallowRow: HTMLCanvasElement[] = [];
      const deepRow: HTMLCanvasElement[] = [];
      for (let v = 0; v < 4; v++) {
        shallowRow.push(this.bakeTownWaterVariant(false, v, f));
        deepRow.push(this.bakeTownWaterVariant(true, v, f));
      }
      baked.townWaterShallowFrames.push(shallowRow);
      baked.townWaterDeepFrames.push(deepRow);
      baked.fountainFrames.push(this.bakeFountainFrame(f));
    }
    for (let v = 0; v < 8; v++) {
      baked.townWallSprites.push(this.bakeTownWallVariant(v));
      baked.townTreeSprites.push(baked.townTreeFrames[0][v]);
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
      if (curX + w + 2 > sheetW) {
        curX = 2;
        curY += rowMaxH + 2;
        rowMaxH = 0;
      }
      if (curY + h + 2 <= baked.masterSheet.height) {
        ctx.drawImage(sp, curX, curY);
        baked.rectMap.set(sp, { sx: curX, sy: curY, sw: w, sh: h });
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
    ctx.strokeStyle = 'rgba(212, 220, 232, 0.75)';
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
    // Light-shaded silver-ash & weathered light limestone brick palette
    // Preserves the 4-course staggered brick geometry, notched corners, and crisp bevels with a bright, clean light shade
    return [
      {
        base: '#9aa4b2',
        upper: '#b2bcc9',
        lower: '#7e8896',
        highlight: '#e2e8f0',
        shadow: '#525b67',
      },
      {
        base: '#a3adbb',
        upper: '#bac4d1',
        lower: '#86909e',
        highlight: '#ecf1f7',
        shadow: '#58616e',
      },
      {
        base: '#adb7c4',
        upper: '#c4ceda',
        lower: '#8f99a7',
        highlight: '#f1f5f9',
        shadow: '#5f6875',
      },
      {
        base: '#929ca9',
        upper: '#a9b3c0',
        lower: '#76808e',
        highlight: '#dbe2ec',
        shadow: '#4c5560',
      },
      {
        base: '#b4becc',
        upper: '#cbd4e0',
        lower: '#96a0ae',
        highlight: '#f8fafc',
        shadow: '#646e7b',
      },
      {
        base: '#9ea8b6',
        upper: '#b6c0cd',
        lower: '#828c9a',
        highlight: '#e6ecf4',
        shadow: '#555e6a',
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

    // Light-shaded reference grey stone bricks for Forgotten Catacombs, or lightened biome bricks for other themes
    const palettes =
      theme.id === 'forgotten_catacombs'
        ? this.getReferenceGreyBrickPalettes()
        : [0, 1, 2, 3, 4, 5].map((i) => {
            const shift = (i - 2) * 5;
            const baseHex = i % 2 === 0 ? theme.floorPrimary : theme.floorSecondary;
            return {
              base: adjustColor(baseHex, shift + 34),
              upper: adjustColor(baseHex, shift + 48),
              lower: adjustColor(baseHex, shift + 18),
              highlight: adjustColor(theme.floorBorder, shift + 62),
              shadow: adjustColor(baseHex, shift - 2),
            };
          });

    this.renderStaggeredBrickTile(ctx, cx, cy, variant, '#363d47', palettes);

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
    // Slightly oversized diamond (33.3 x 16.65) with ZERO border stroke so adjacent tiles fuse seamlessly!
    const hw = 33.3;
    const hh = 16.65;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    // Base fill: clean slate mortar for light-shaded stone brick roads, vibrant sunlit emerald-meadow green for grass
    ctx.fillStyle = isRoad ? '#383f4a' : '#35a849';
    ctx.fill();

    ctx.save();
    ctx.clip();

    if (isRoad) {
      // Light-Shaded Reference 4-Course Staggered Stone Brick Tile
      this.renderStaggeredBrickTile(
        ctx,
        cx,
        cy,
        variant,
        '#383f4a',
        this.getReferenceGreyBrickPalettes()
      );
    } else {
      // Vibrant Sunlit Emerald Meadow Grass with Subtle Wind-Sway Animation
      const swayPhase = (swayFrame / 6) * Math.PI * 2;
      const strokes = [
        { ox: -8 + (variant % 3) * 3, oy: -4, rx: 14, ry: 3.6, col: 'rgba(84, 210, 82, 0.45)' },
        { ox: 6 - (variant % 2) * 4, oy: 3, rx: 13, ry: 3.3, col: 'rgba(34, 134, 54, 0.36)' },
        { ox: -3 + (variant % 4) * 2, oy: 1, rx: 11, ry: 2.9, col: 'rgba(134, 239, 102, 0.36)' },
      ];
      for (const st of strokes) {
        ctx.fillStyle = st.col;
        ctx.beginPath();
        ctx.ellipse(cx + st.ox, cy + st.oy, st.rx, st.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Layered Vibrant Grass Blade Clumps with Wind-Sway Bending at the Tips
      const tuftCount = 4 + (variant % 2);
      for (let t = 0; t < tuftCount; t++) {
        const th = spatialHash(variant * 11 + t, t, 509);
        const u = ((th & 0xff) / 255) * 0.58 + 0.21;
        const v = (((th >>> 8) & 0xff) / 255) * 0.58 + 0.21;
        const pt = isoUV(cx, cy, u, v, 30, 15);
        const windBend = Math.sin(swayPhase + t * 0.85 + variant * 0.6) * 2.35;

        // Soft emerald-moss shadow under grass tuft
        ctx.fillStyle = 'rgba(20, 83, 35, 0.52)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 1.2, 4.4, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rich emerald, spring green, & sunlit chartreuse-lime grass blades bending with the breeze
        const blades = [
          { dx: -3.0, dy: -3.5, col: '#1f7a34', swayScale: 0.7 },
          { dx: -1.4, dy: -5.0, col: '#2eb84a', swayScale: 0.95 },
          { dx: 0.3, dy: -5.6, col: '#84e85a', swayScale: 1.15 },
          { dx: 1.8, dy: -4.6, col: '#4ade80', swayScale: 1.0 },
          { dx: 3.2, dy: -3.2, col: '#228b3b', swayScale: 0.75 },
        ];
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        for (const bl of blades) {
          const tipBend = windBend * bl.swayScale;
          ctx.strokeStyle = bl.col;
          ctx.beginPath();
          ctx.moveTo(pt.x + bl.dx * 0.3, pt.y + 0.8);
          ctx.quadraticCurveTo(
            pt.x + bl.dx * 0.65 + tipBend * 0.45,
            pt.y + bl.dy * 0.5,
            pt.x + bl.dx + tipBend,
            pt.y + bl.dy + Math.abs(tipBend) * 0.18
          );
          ctx.stroke();
        }
      }

      // 3. Swaying Wildflowers & Lupine Spikes on Meadow Variants
      const flowerSway = Math.sin(swayPhase + variant) * 2.1;
      if (variant === 2 || variant === 6) {
        const lPt = isoUV(cx, cy, variant === 2 ? 0.46 : 0.54, 0.48, 28, 14);
        ctx.fillStyle = '#1e6b2e';
        ctx.beginPath();
        ctx.ellipse(lPt.x, lPt.y + 1.5, 4.5, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Swaying stem
        ctx.strokeStyle = '#2eb84a';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(lPt.x, lPt.y + 1);
        ctx.quadraticCurveTo(lPt.x + flowerSway * 0.5, lPt.y - 4, lPt.x + flowerSway, lPt.y - 9);
        ctx.stroke();

        // Layered vibrant violet-lavender lupine florets swaying with the stem
        const florets = [
          { ox: -1.5, oy: -2.5, r: 1.6, col: '#7c3aed', hFrac: 0.3 },
          { ox: 1.5, oy: -3.0, r: 1.6, col: '#8b5cf6', hFrac: 0.35 },
          { ox: -1.3, oy: -4.8, r: 1.5, col: '#a78bfa', hFrac: 0.55 },
          { ox: 1.3, oy: -5.2, r: 1.5, col: '#c4b5fd', hFrac: 0.6 },
          { ox: -0.9, oy: -7.0, r: 1.3, col: '#ddd6fe', hFrac: 0.8 },
          { ox: 0.9, oy: -7.3, r: 1.3, col: '#ede9fe', hFrac: 0.85 },
          { ox: 0, oy: -9.0, r: 1.2, col: '#f5f3ff', hFrac: 1.0 },
        ];
        for (const fl of florets) {
          ctx.fillStyle = fl.col;
          ctx.beginPath();
          ctx.arc(lPt.x + fl.ox + flowerSway * fl.hFrac, lPt.y + fl.oy, fl.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (variant === 4 || variant === 1) {
        // Swaying golden buttercup & white daisy cluster
        const fPt = isoUV(cx, cy, 0.52, 0.45, 28, 14);
        ctx.fillStyle = variant === 1 ? '#fde047' : '#fef9c3';
        ctx.beginPath();
        ctx.arc(fPt.x - 2 + flowerSway * 0.5, fPt.y - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(fPt.x + 2.2 + flowerSway * 0.5, fPt.y + 0.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(fPt.x - 2 + flowerSway * 0.5, fPt.y - 1, 0.65, 0, Math.PI * 2);
        ctx.fill();
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

    const phase = (frame / 8) * Math.PI * 2;
    const flowShift = ((frame / 8) * 16 + variant * 4) % 16;

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
    const phase = (frame / 8) * Math.PI * 2;
    const flowFrac = frame / 8;

    // 1. Ground Shadow & Circular Radial Carved Stone Tile Plaza Ring
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 62, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    // Circular Radial Stone Tile Apron
    const apronRx = 56;
    const apronRy = 28;
    ctx.fillStyle = '#9c9284';
    ctx.strokeStyle = '#26211c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, apronRx, apronRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radial stone joints around the circular stone apron
    ctx.strokeStyle = 'rgba(33, 28, 23, 0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * 42, y + 2 + Math.sin(a) * 21);
      ctx.lineTo(x + Math.cos(a) * apronRx, y + 2 + Math.sin(a) * apronRy);
    }
    ctx.stroke();

    // 2. Lower Basin Cylindrical Carved Stone Masonry Wall
    const basinRx = 46;
    const basinRy = 23;
    const wallDrop = 9;

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

    // Top Carved Stone Coping Rim
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, basinRx, basinRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * 38, y - 2 + Math.sin(a) * 19);
      ctx.lineTo(x + Math.cos(a) * basinRx, y - 2 + Math.sin(a) * basinRy);
    }
    ctx.stroke();

    // 3. Lower Pool Water with Shimmering Reflection Streaks & Expanding Ripples (Reference Images 2, 5, 6)
    const poolRx = 38;
    const poolRy = 19;
    const waterGrad = ctx.createRadialGradient(x, y - 2, 4, x, y - 2, poolRx);
    waterGrad.addColorStop(0, '#22d3ee');
    waterGrad.addColorStop(0.55, '#18829e');
    waterGrad.addColorStop(1, '#0e5469');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, poolRx, poolRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal shimmering water reflection streaks in lower pool
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.65)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let s = -1; s <= 1; s++) {
      const sx = x + s * 16 + Math.sin(phase + s) * 3;
      const sy = y + 6 + Math.abs(s) * 2;
      ctx.moveTo(sx - 7, sy);
      ctx.lineTo(sx + 7, sy);
    }
    ctx.stroke();

    // Expanding concentric white-cyan ripple rings in lower pool (Reference Images 5 & 6)
    for (let ring = 0; ring < 2; ring++) {
      const prog = (flowFrac + ring * 0.5) % 1;
      const rRx = 18 + prog * 18;
      const rRy = 9 + prog * 9;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - prog) * 0.72})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, rRx, rRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Lower Pedestal & Middle Circular Carved Stone Bowl (y - 23)
    const midY = y - 23;
    const midRx = 25;
    const midRy = 12.5;

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.3;
    ctx.fillRect(x - 10, midY, 20, 19);
    ctx.strokeRect(x - 10, midY, 20, 19);

    // Middle Stone Bowl Rim
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(x, midY, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#18829e';
    ctx.beginPath();
    ctx.ellipse(x, midY, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cel-Shaded Cascading Waterfall Sheet & Frothy Splash Foam Cushion (Reference Images 1, 2, 3, 5, 6)
    // Translucent cyan waterfall curtain pouring over the front arc of the middle stone bowl
    ctx.fillStyle = 'rgba(34, 211, 238, 0.52)';
    ctx.beginPath();
    ctx.moveTo(x - 21, midY + 4);
    ctx.quadraticCurveTo(x, midY + 13, x + 21, midY + 4);
    ctx.lineTo(x + 23, y - 1);
    ctx.quadraticCurveTo(x, y + 9, x - 23, y - 1);
    ctx.closePath();
    ctx.fill();

    // Animated vertical white-cyan water streaks & cellular foam bands scrolling down the waterfall (Reference Images 1, 2, 5, 6)
    ctx.lineCap = 'round';
    for (let s = 0; s < 9; s++) {
      const a = (0.14 + (s / 8) * 0.72) * Math.PI;
      const topX = x + Math.cos(a) * (midRx - 2);
      const topY = midY + Math.sin(a) * (midRy - 1);
      const botY = topY + 19;

      // Flowing sinusoidal streak
      ctx.strokeStyle = s % 2 === 0 ? 'rgba(224, 242, 254, 0.88)' : 'rgba(103, 232, 249, 0.75)';
      ctx.lineWidth = s % 2 === 0 ? 1.8 : 1.4;
      ctx.beginPath();
      const streakOff = ((flowFrac * 18 + s * 5) % 14);
      ctx.moveTo(topX + Math.sin(phase + s) * 1.2, topY + streakOff * 0.25);
      ctx.quadraticCurveTo(
        topX - Math.sin(phase + s) * 1.5,
        (topY + botY) * 0.5,
        topX + Math.cos(phase + s) * 1.2,
        botY - 2
      );
      ctx.stroke();

      // Billowing white-cyan frothy foam puffs at the base of the waterfall (Reference Images 2, 5, 6)
      const puffR = 3.2 + Math.sin(phase + s * 1.3) * 0.9;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(topX, botY, puffR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Upper Carved Stone Pedestal, Top Crown Bowl & Cel-Shaded Splash Plume (Reference Images 1 & 3)
    const topTierY = y - 41;
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x - 6, topTierY, 12, 17);
    ctx.strokeRect(x - 6, topTierY, 12, 17);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(x, topTierY, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Upper waterfall curtain into middle bowl
    ctx.fillStyle = 'rgba(56, 189, 248, 0.58)';
    ctx.beginPath();
    ctx.moveTo(x - 10, topTierY + 2);
    ctx.quadraticCurveTo(x, topTierY + 7, x + 10, topTierY + 2);
    ctx.lineTo(x + 12, midY - 1);
    ctx.quadraticCurveTo(x, midY + 5, x - 12, midY - 1);
    ctx.closePath();
    ctx.fill();

    // Stylized cel-shaded curling fountain splash arcs & water droplets at top crown (Reference Images 1 & 3)
    const plumeH = 11 + Math.sin(phase) * 2.2;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x, topTierY);
    ctx.quadraticCurveTo(x - 7, topTierY - plumeH, x - 13, topTierY - 2);
    ctx.moveTo(x, topTierY);
    ctx.quadraticCurveTo(x + 7, topTierY - plumeH, x + 13, topTierY - 2);
    ctx.stroke();

    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, topTierY - 1);
    ctx.quadraticCurveTo(x - 6, topTierY - plumeH - 1, x - 12, topTierY - 3);
    ctx.moveTo(x, topTierY - 1);
    ctx.quadraticCurveTo(x + 6, topTierY - plumeH - 1, x + 12, topTierY - 3);
    ctx.stroke();

    // Airborne water droplets (Reference Images 1 & 3)
    const dropOffset = (flowFrac * 10) % 6;
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(x - 14 - dropOffset * 0.4, topTierY - 5 + dropOffset, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 14 + dropOffset * 0.4, topTierY - 5 + dropOffset, 1.8, 0, Math.PI * 2);
    ctx.arc(x, topTierY - plumeH - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('SANCTUARY FOUNTAIN', x, y - 60);

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
    const species = variant % 4; // 0 = Emerald Oak, 1 = Highland Spruce Pine, 2 = Golden Birch, 3 = Blossoming Sakura
    const swayPhase = (swayFrame / 6) * Math.PI * 2;
    const baseSway = Math.sin(swayPhase) * 2.8;
    const crownBob = Math.cos(swayPhase * 2) * 0.85;

    // 1. Dappled Ground Shadow & Vibrant Mossy Root Base
    const shadowGrad = ctx.createRadialGradient(x + 3 + baseSway * 0.3, y + 3, 4, x + 3, y + 3, 33 * scale);
    shadowGrad.addColorStop(0, 'rgba(5, 16, 10, 0.58)');
    shadowGrad.addColorStop(0.65, 'rgba(8, 26, 16, 0.28)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x + 3 + baseSway * 0.25, y + 3, 33 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 15 * scale, 6.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (species === 1) {
      // SPECIES 1: Vibrant Highland Emerald-Spruce Pine with Wind-Swaying Boughs
      const trunkGrad = ctx.createLinearGradient(x - 6, y, x + 6, y);
      trunkGrad.addColorStop(0, '#6b341a');
      trunkGrad.addColorStop(0.5, '#47210f');
      trunkGrad.addColorStop(1, '#291106');
      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      ctx.moveTo(x - 8 * scale, y + 4);
      ctx.quadraticCurveTo(x - 4 * scale, y - 4, x - 3.5 * scale + baseSway * 0.6, y - 48 * scale);
      ctx.lineTo(x + 3.5 * scale + baseSway * 0.6, y - 48 * scale);
      ctx.quadraticCurveTo(x + 4 * scale, y - 4, x + 8 * scale, y + 4);
      ctx.closePath();
      ctx.fill();

      const tiers = [
        { oy: -16, w: 30, h: 24, swayMul: 0.45, dark: '#063b2a', mid: '#0e694b', lit: '#189e70' },
        { oy: -31, w: 26, h: 23, swayMul: 0.72, dark: '#084733', mid: '#127d59', lit: '#22b883' },
        { oy: -46, w: 21, h: 21, swayMul: 1.0, dark: '#0a543c', mid: '#169168', lit: '#2dd498' },
        { oy: -60, w: 16, h: 19, swayMul: 1.28, dark: '#0d6347', mid: '#1ca678', lit: '#4ade80' },
        { oy: -73, w: 10, h: 16, swayMul: 1.55, dark: '#117554', mid: '#26bd8a', lit: '#86efac' },
      ];

      for (let tIdx = 0; tIdx < tiers.length; tIdx++) {
        const t = tiers[tIdx];
        const tierSway = Math.sin(swayPhase - tIdx * 0.32) * 3.1 * t.swayMul;
        const txCenter = x + tierSway;
        const baseY = y + t.oy * scale + crownBob * t.swayMul * 0.5;
        const peakY = baseY - t.h * scale;
        const halfW = t.w * scale;

        ctx.fillStyle = t.dark;
        ctx.beginPath();
        ctx.moveTo(txCenter + tierSway * 0.25, peakY);
        ctx.quadraticCurveTo(txCenter + halfW * 0.6, baseY - 4, txCenter + halfW, baseY + 2);
        ctx.quadraticCurveTo(txCenter + halfW * 0.5, baseY + 7, txCenter + halfW * 0.18, baseY + 3);
        ctx.quadraticCurveTo(txCenter, baseY + 8, txCenter - halfW * 0.18, baseY + 3);
        ctx.quadraticCurveTo(txCenter - halfW * 0.5, baseY + 7, txCenter - halfW, baseY + 2);
        ctx.quadraticCurveTo(txCenter - halfW * 0.6, baseY - 4, txCenter + tierSway * 0.25, peakY);
        ctx.closePath();
        ctx.fill();

        const boughGrad = ctx.createLinearGradient(txCenter - halfW, peakY, txCenter + halfW, baseY);
        boughGrad.addColorStop(0, t.lit);
        boughGrad.addColorStop(0.55, t.mid);
        boughGrad.addColorStop(1, t.dark);
        ctx.fillStyle = boughGrad;
        ctx.beginPath();
        ctx.moveTo(txCenter + tierSway * 0.25, peakY);
        ctx.quadraticCurveTo(txCenter + halfW * 0.55, baseY - 5, txCenter + halfW * 0.9, baseY);
        ctx.quadraticCurveTo(txCenter + halfW * 0.4, baseY + 4, txCenter, baseY + 2);
        ctx.quadraticCurveTo(txCenter - halfW * 0.4, baseY + 4, txCenter - halfW * 0.9, baseY);
        ctx.quadraticCurveTo(txCenter - halfW * 0.55, baseY - 5, txCenter + tierSway * 0.25, peakY);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // SPECIES 0 (Vibrant Emerald Oak), 2 (Sunlit Golden Birch), 3 (Radiant Blossoming Sakura)
      const isBirch = species === 2;
      const isBlossom = species === 3;

      const trunkLeft = isBirch ? '#f1f5f9' : isBlossom ? '#54291a' : '#78442a';
      const trunkMid = isBirch ? '#cbd5e1' : isBlossom ? '#3d1c11' : '#542d19';
      const trunkRight = isBirch ? '#64748b' : isBlossom ? '#240f08' : '#30180b';

      const trunkGrad = ctx.createLinearGradient(x - 10, y, x + 10, y);
      trunkGrad.addColorStop(0, trunkLeft);
      trunkGrad.addColorStop(0.5, trunkMid);
      trunkGrad.addColorStop(1, trunkRight);
      ctx.fillStyle = trunkGrad;

      const branchSway = baseSway * 0.55;
      ctx.beginPath();
      ctx.moveTo(x - 11 * scale, y + 4);
      ctx.quadraticCurveTo(x - 6 * scale, y - 2, x - 5.5 * scale + branchSway * 0.4, y - 16 * scale);
      ctx.lineTo(x - 15 * scale + branchSway, y - 34 * scale);
      ctx.lineTo(x - 10 * scale + branchSway, y - 36 * scale);
      ctx.lineTo(x - 2 * scale + branchSway * 0.6, y - 22 * scale);
      ctx.lineTo(x + 2 * scale + branchSway * 0.6, y - 24 * scale);
      ctx.lineTo(x + 12 * scale + branchSway, y - 35 * scale);
      ctx.lineTo(x + 16 * scale + branchSway, y - 32 * scale);
      ctx.lineTo(x + 5.5 * scale + branchSway * 0.4, y - 15 * scale);
      ctx.quadraticCurveTo(x + 6 * scale, y - 2, x + 11 * scale, y + 4);
      ctx.quadraticCurveTo(x, y + 6, x - 11 * scale, y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isBirch ? '#334155' : 'rgba(15, 8, 4, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      if (isBirch) {
        ctx.moveTo(x - 4 * scale, y - 6 * scale);
        ctx.lineTo(x + 2 * scale, y - 6 * scale);
        ctx.moveTo(x - 3 * scale, y - 13 * scale);
        ctx.lineTo(x + 4 * scale, y - 13 * scale);
        ctx.moveTo(x - 4 * scale + branchSway * 0.3, y - 19 * scale);
        ctx.lineTo(x + 1 * scale + branchSway * 0.3, y - 19 * scale);
      } else {
        ctx.moveTo(x - 3 * scale, y + 3);
        ctx.quadraticCurveTo(x - 2 * scale, y - 10 * scale, x - 4 * scale + branchSway * 0.5, y - 22 * scale);
        ctx.moveTo(x + 2 * scale, y + 4);
        ctx.quadraticCurveTo(x + 1 * scale, y - 9 * scale, x + 3 * scale + branchSway * 0.5, y - 20 * scale);
      }
      ctx.stroke();

      // Vibrant, Lush, Saturated Foliage Palettes
      const palette = isBirch
        ? {
            shadow: '#78350f',
            deep: '#b45309',
            mid: '#ea580c',
            bright: '#f59e0b',
            crown: '#fef08a',
          }
        : isBlossom
        ? {
            shadow: '#500724',
            deep: '#9d174d',
            mid: '#ec4899',
            bright: '#f472b6',
            crown: '#ffe4e6',
          }
        : {
            shadow: '#0c4a24',
            deep: '#157a3a',
            mid: '#22a852',
            bright: '#4ade80',
            crown: '#bef264',
          };

      const drawLeafCloud = (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        topCol: string,
        botCol: string,
        swayFactor: number
      ) => {
        const scx = cx + baseSway * swayFactor;
        const scy = cy + crownBob * swayFactor * 0.6;
        const g = ctx.createLinearGradient(scx, scy - ry, scx, scy + ry);
        g.addColorStop(0, topCol);
        g.addColorStop(0.65, botCol);
        g.addColorStop(1, palette.shadow);
        ctx.fillStyle = g;

        ctx.beginPath();
        const lobes = 7;
        for (let i = 0; i < lobes; i++) {
          const a = (i / lobes) * Math.PI * 2 + Math.sin(swayPhase + i) * 0.05;
          const lx = scx + Math.cos(a) * rx * 0.62;
          const ly = scy + Math.sin(a) * ry * 0.62;
          const lobeR = (i % 2 === 0 ? 0.53 : 0.45) * Math.min(rx, ry * 1.35);
          ctx.moveTo(lx + lobeR, ly);
          ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
        }
        ctx.moveTo(scx + rx * 0.72, scy);
        ctx.ellipse(scx, scy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      drawLeafCloud(x - 16 * scale, y - 34 * scale, 19 * scale, 13 * scale, palette.deep, palette.shadow, 0.75);
      drawLeafCloud(x + 16 * scale, y - 33 * scale, 19 * scale, 13 * scale, palette.deep, palette.shadow, 0.75);
      drawLeafCloud(x, y - 30 * scale, 24 * scale, 15 * scale, palette.deep, palette.shadow, 0.65);

      drawLeafCloud(x - 14 * scale, y - 42 * scale, 20 * scale, 14 * scale, palette.bright, palette.mid, 1.05);
      drawLeafCloud(x + 13 * scale, y - 41 * scale, 20 * scale, 14 * scale, palette.bright, palette.mid, 1.05);
      drawLeafCloud(x, y - 46 * scale, 24 * scale, 16 * scale, palette.bright, palette.mid, 1.15);

      drawLeafCloud(x - 6 * scale, y - 55 * scale, 17 * scale, 12 * scale, palette.crown, palette.bright, 1.35);
      drawLeafCloud(x + 6 * scale, y - 53 * scale, 15 * scale, 11 * scale, palette.crown, palette.bright, 1.35);

      // Sunlit Rustling Crown Leaf Clusters (swaying with the upper canopy)
      const topSway = baseSway * 1.45;
      ctx.fillStyle = palette.crown;
      ctx.beginPath();
      ctx.arc(x - 8 * scale + topSway, y - 59 * scale + crownBob, 4.6 * scale, 0, Math.PI * 2);
      ctx.arc(x - 2 * scale + topSway, y - 61 * scale + crownBob, 5.4 * scale, 0, Math.PI * 2);
      ctx.arc(x + 5 * scale + topSway, y - 58 * scale + crownBob, 4.2 * scale, 0, Math.PI * 2);
      ctx.arc(x - 16 * scale + baseSway * 1.1, y - 47 * scale + crownBob * 0.7, 4.3 * scale, 0, Math.PI * 2);
      ctx.arc(x + 14 * scale + baseSway * 1.1, y - 46 * scale + crownBob * 0.7, 4.0 * scale, 0, Math.PI * 2);
      ctx.fill();
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
