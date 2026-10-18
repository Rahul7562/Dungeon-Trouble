import { DungeonThemeConfig } from './world';

export interface BakedThemeAtlas {
  themeId: string;
  floorSprites: HTMLCanvasElement[];
  wallSprites: HTMLCanvasElement[];
  townRoadSprites: HTMLCanvasElement[];
  townGrassSprites: HTMLCanvasElement[];
  townWallSprites: HTMLCanvasElement[];
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

    const baked: BakedThemeAtlas = {
      themeId: theme.id,
      floorSprites: [],
      wallSprites: [],
      townRoadSprites: [],
      townGrassSprites: [],
      townWallSprites: [],
    };

    for (let v = 0; v < 16; v++) {
      baked.floorSprites.push(this.bakeDungeonFloorVariant(theme, v));
    }
    for (let v = 0; v < 8; v++) {
      baked.wallSprites.push(this.bakeDungeonWallVariant(theme, v));
    }
    for (let v = 0; v < 8; v++) {
      baked.townRoadSprites.push(this.bakeTownFloorVariant(true, v));
      baked.townGrassSprites.push(this.bakeTownFloorVariant(false, v));
    }
    for (let v = 0; v < 4; v++) {
      baked.townWallSprites.push(this.bakeTownWallVariant(v));
    }

    this.cache.set(theme.id, baked);
    return baked;
  }

  private bakeDungeonFloorVariant(theme: DungeonThemeConfig, variant: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const cx = 36;
    const cy = 20;
    const hw = 32;
    const hh = 16;

    // 1. Deep mortar bed diamond
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = adjustColor(theme.floorSecondary, -18);
    ctx.fill();

    // Clip to diamond interior so sub-slabs and details stay crisp
    ctx.save();
    ctx.clip();

    // 2. Sub-divided isometric ashlar stone slabs (staggered 2x2 or 2x3 masonry pattern)
    const splitU = 0.44 + ((variant * 7) % 3) * 0.06;
    const splitV1 = 0.48 + ((variant * 11) % 3) * 0.05;
    const splitV2 = 0.52 - ((variant * 5) % 3) * 0.05;
    const gap = 0.025;

    const slabs = [
      { u0: gap, v0: gap, u1: splitU - gap, v1: splitV1 - gap, shade: ((variant * 3) % 9) - 4 },
      { u0: gap, v0: splitV1 + gap, u1: splitU - gap, v1: 1 - gap, shade: ((variant * 5) % 11) - 5 },
      { u0: splitU + gap, v0: gap, u1: 1 - gap, v1: splitV2 - gap, shade: ((variant * 7) % 11) - 5 },
      { u0: splitU + gap, v0: splitV2 + gap, u1: 1 - gap, v1: 1 - gap, shade: ((variant * 13) % 9) - 4 },
    ];

    const baseHex = variant % 2 === 0 ? theme.floorPrimary : theme.floorSecondary;

    for (let s = 0; s < slabs.length; s++) {
      const slab = slabs[s];
      const p0 = isoUV(cx, cy, slab.u0, slab.v0, hw, hh);
      const p1 = isoUV(cx, cy, slab.u1, slab.v0, hw, hh);
      const p2 = isoUV(cx, cy, slab.u1, slab.v1, hw, hh);
      const p3 = isoUV(cx, cy, slab.u0, slab.v1, hw, hh);

      // Sunken corner slab on variants 13 & 14
      const isSunken = (variant === 13 || variant === 14) && s === 2;
      const toneShift = isSunken ? -14 : slab.shade + (variant % 4) * 1.5;

      const grad = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
      grad.addColorStop(0, adjustColor(baseHex, toneShift + 9));
      grad.addColorStop(0.6, adjustColor(baseHex, toneShift + 2));
      grad.addColorStop(1, adjustColor(baseHex, toneShift - 8));

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Top-left bevel highlight (light catching the chiseled stone edge)
      ctx.strokeStyle = adjustColor(theme.floorBorder, 18, 0.45);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Bottom-right bevel shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
    }

    // 3. Procedural mineral grain & micro-pitting across the stone surface
    for (let g = 0; g < 22; g++) {
      const h = spatialHash(variant, g, 101);
      const u = ((h & 0xff) / 255) * 0.86 + 0.07;
      const v = (((h >>> 8) & 0xff) / 255) * 0.86 + 0.07;
      const pt = isoUV(cx, cy, u, v, hw, hh);
      const isDark = (h & 1) === 0;
      ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(pt.x, pt.y, 1.5, 1.2);
    }

    // 4. Variant-specific handcrafted weathering details
    // Deep branching masonry cracks (variants 2, 5, 6, 7, 13)
    if (variant === 2 || variant === 5 || variant === 6 || variant === 7 || variant === 13) {
      const cStart = isoUV(cx, cy, 0.25 + (variant % 3) * 0.1, 0.2, hw, hh);
      const cMid = isoUV(cx, cy, 0.52, 0.54, hw, hh);
      const cEnd = isoUV(cx, cy, 0.78, 0.42 + (variant % 2) * 0.25, hw, hh);
      const cBranch = isoUV(cx, cy, 0.38, 0.78, hw, hh);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cStart.x, cStart.y);
      ctx.lineTo(cMid.x, cMid.y);
      ctx.lineTo(cEnd.x, cEnd.y);
      ctx.moveTo(cMid.x, cMid.y);
      ctx.lineTo(cBranch.x, cBranch.y);
      ctx.stroke();

      // Chiseled edge highlight beside the fracture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(cStart.x + 0.8, cStart.y + 0.8);
      ctx.lineTo(cMid.x + 0.8, cMid.y + 0.8);
      ctx.lineTo(cEnd.x + 0.8, cEnd.y + 0.8);
      ctx.stroke();
    }

    // Scattered stone pebbles & chipped masonry debris (variants 4, 6, 10, 14)
    if (variant === 4 || variant === 6 || variant === 10 || variant === 14) {
      const pebbles = [
        { u: 0.3, v: 0.65, r: 2.1 },
        { u: 0.36, v: 0.7, r: 1.5 },
        { u: 0.72, v: 0.28, r: 1.8 },
      ];
      for (const peb of pebbles) {
        const pt = isoUV(cx, cy, peb.u, peb.v, hw, hh);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(pt.x + 0.8, pt.y + 1, peb.r, peb.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = adjustColor(theme.floorBorder, 14);
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, peb.r, peb.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Biome-specific crevice growth: Moss / Hoarfrost / Eldritch Corruption / Magma Veins (variants 8, 9, 10)
    if (variant === 8 || variant === 9 || variant === 10) {
      const primaryMoss =
        theme.id === 'forgotten_catacombs'
          ? 'rgba(54, 83, 20, 0.68)'
          : theme.id === 'frozen_depths'
          ? 'rgba(56, 189, 248, 0.36)'
          : theme.id === 'corrupted_temple'
          ? 'rgba(147, 51, 234, 0.42)'
          : 'rgba(234, 88, 12, 0.48)';
      const highlightMoss =
        theme.id === 'forgotten_catacombs'
          ? 'rgba(101, 163, 13, 0.52)'
          : theme.id === 'frozen_depths'
          ? 'rgba(186, 230, 253, 0.48)'
          : theme.id === 'corrupted_temple'
          ? 'rgba(216, 180, 254, 0.45)'
          : 'rgba(253, 224, 71, 0.55)';

      const clusters =
        variant === 8
          ? [
              { u: splitU, v: 0.32, rx: 5, ry: 2.5 },
              { u: splitU + 0.06, v: 0.4, rx: 3.5, ry: 1.8 },
            ]
          : variant === 9
          ? [
              { u: 0.25, v: splitV1, rx: 5.5, ry: 2.6 },
              { u: 0.68, v: splitV2, rx: 4.5, ry: 2.2 },
            ]
          : [
              { u: 0.18, v: 0.22, rx: 6, ry: 3 },
              { u: splitU, v: splitV1, rx: 4.5, ry: 2.4 },
            ];

      for (const cl of clusters) {
        const pt = isoUV(cx, cy, cl.u, cl.v, hw, hh);
        ctx.fillStyle = primaryMoss;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, cl.rx, cl.ry, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = highlightMoss;
        ctx.beginPath();
        ctx.ellipse(pt.x - 1, pt.y - 0.5, cl.rx * 0.5, cl.ry * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ancient dried bloodstains & bone splinters (variants 11, 12)
    if (variant === 11 || variant === 12) {
      const bPt = isoUV(cx, cy, variant === 11 ? 0.58 : 0.36, 0.52, hw, hh);
      ctx.fillStyle = 'rgba(127, 29, 29, 0.52)';
      ctx.beginPath();
      ctx.ellipse(bPt.x, bPt.y, 6.5, 3.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(69, 10, 10, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bPt.x + 2, bPt.y + 0.8, 3.5, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      if (variant === 12) {
        // Tiny bleached bone shard on floor
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bPt.x - 4, bPt.y - 1);
        ctx.lineTo(bPt.x + 2, bPt.y + 2);
        ctx.stroke();
      }
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

    // Outer isometric mortar perimeter stroke
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.lineWidth = 0.85;
    ctx.stroke();

    return canvas;
  }

  private bakeTownFloorVariant(isRoad: boolean, variant: number): HTMLCanvasElement {
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
    ctx.fillStyle = isRoad ? '#1b2230' : '#0f1c24';
    ctx.fill();

    ctx.save();
    ctx.clip();

    if (isRoad) {
      // Hand-laid rounded sanctuary cobblestones
      const cobbleRows = 3;
      const cobbleCols = 3;
      for (let r = 0; r < cobbleRows; r++) {
        for (let c = 0; c < cobbleCols; c++) {
          const u = (r + 0.5 + ((c % 2) * 0.15 - 0.07)) / cobbleRows;
          const v = (c + 0.5 + ((r % 2) * 0.15 - 0.07)) / cobbleCols;
          const pt = isoUV(cx, cy, u, v, hw, hh);
          const h = spatialHash(r + variant, c, 55);
          const shade = (h % 14) - 7;

          ctx.fillStyle = adjustColor('#2d3748', shade);
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, 7.5, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 0.5, 5, Math.PI, Math.PI * 1.85);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, 7.5, 3.8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else {
      // Lush dark sanctuary turf with stone stepping flags & grass tufts
      const grad = ctx.createLinearGradient(cx - hw, cy - hh, cx + hw, cy + hh);
      grad.addColorStop(0, adjustColor('#162936', (variant % 3) * 2));
      grad.addColorStop(1, adjustColor('#101f29', -(variant % 3) * 2));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 72, 40);

      for (let g = 0; g < 10; g++) {
        const h = spatialHash(variant, g, 303);
        const u = ((h & 0xff) / 255) * 0.8 + 0.1;
        const v = (((h >>> 8) & 0xff) / 255) * 0.8 + 0.1;
        const pt = isoUV(cx, cy, u, v, hw, hh);
        ctx.fillStyle = (h & 1) === 0 ? 'rgba(34, 197, 94, 0.16)' : 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, 3.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (variant % 3 === 0) {
        // Small clover / grass blades
        const bPt = isoUV(cx, cy, 0.5, 0.5, hw, hh);
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bPt.x, bPt.y + 1);
        ctx.lineTo(bPt.x - 2, bPt.y - 3);
        ctx.moveTo(bPt.x, bPt.y + 1);
        ctx.lineTo(bPt.x + 2, bPt.y - 3);
        ctx.stroke();
      }
    }

    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = isRoad ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 0.75;
    ctx.stroke();

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

  private bakeTownWallVariant(variant: number): HTMLCanvasElement {
    const townTheme: DungeonThemeConfig = {
      id: 'forgotten_catacombs',
      name: 'Sanctuary',
      floorPrimary: '#283142',
      floorSecondary: '#232b3a',
      floorBorder: '#475569',
      wallLeft: '#1e293b',
      wallRight: '#334155',
      wallTop: '#475569',
      wallBorder: '#94a3b8',
      ambientLightColor: 'rgba(245, 158, 11, 0.1)',
      torchColor: '#f59e0b',
      fogColor: 'rgba(6, 8, 14, 0.5)',
    };
    return this.bakeDungeonWallVariant(townTheme, variant);
  }
}
