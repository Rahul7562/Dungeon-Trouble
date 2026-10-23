import { EnemyEntity, NPCEntity, SummonEntity } from './types';

export interface HeroRenderState {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  facingAngle: number;
  isAttacking: boolean;
  attackAnimTimer: number;
  health: number;
  maxHealth: number;
  playerName?: string;
  playerClass?: string;
  hitFlashTimer?: number;
  statusEffects?: { name: string; color: string }[];
}

// Convert world-space facing angle into isometric screen-space angle
export function worldAngleToIsoAngle(worldAngle: number): number {
  const wx = Math.cos(worldAngle);
  const wy = Math.sin(worldAngle);
  const sx = (wx - wy) * 32;
  const sy = (wx + wy) * 16;
  return Math.atan2(sy, sx);
}

export function drawHeroRig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  player: HeroRenderState,
  gameTime: number,
  opts?: { isGhost?: boolean; ghostColor?: string; ghostAlpha?: number }
): void {
  const isGhost = opts?.isGhost ?? false;
  const pClass = player.playerClass || 'swordsman';
  const isoAngle = worldAngleToIsoAngle(player.facingAngle);
  const dirX = Math.cos(isoAngle);
  const dirY = Math.sin(isoAngle);
  const facingBack = dirY < -0.15; // Facing away/north in isometric screen space
  const flipX = dirX < -0.1 ? -1 : 1;

  const speed = Math.hypot(player.vx || 0, player.vy || 0);
  const isMoving = speed > 5 && !isGhost;
  const walkCycle = isMoving ? gameTime * 13.5 : 0;
  const strideL = isMoving ? Math.sin(walkCycle) * 6.0 : 0;
  const strideR = isMoving ? -Math.sin(walkCycle) * 6.0 : 0;
  const liftL = isMoving ? Math.max(0, -Math.cos(walkCycle)) * 3.8 : 0;
  const liftR = isMoving ? Math.max(0, Math.cos(walkCycle)) * 3.8 : 0;
  const bob = isMoving
    ? Math.abs(Math.sin(walkCycle)) * 2.5
    : Math.sin(gameTime * 3.2) * 1.1;

  // Attack / Cast progress (0 -> 1)
  const attackProgress = player.isAttacking
    ? Math.max(0, Math.min(1, 1 - player.attackAnimTimer / 0.3))
    : 0;
  const swingAngle = player.isAttacking
    ? -1.35 + Math.sin(attackProgress * Math.PI) * 2.65
    : 0;
  const lungeX = player.isAttacking ? dirX * Math.sin(attackProgress * Math.PI) * 6 : 0;
  const lungeY = player.isAttacking ? dirY * Math.sin(attackProgress * Math.PI) * 4 : 0;

  // Class color palettes
  const palette =
    pClass === 'archer'
      ? {
          cape: '#14532d',
          capeEdge: '#22c55e',
          armorDark: '#1e293b',
          armorMain: '#166534',
          armorTrim: '#eab308',
          helm: '#15803d',
          glow: '#4ade80',
        }
      : pClass === 'mage'
      ? {
          cape: '#1e3a8a',
          capeEdge: '#38bdf8',
          armorDark: '#0f172a',
          armorMain: '#1d4ed8',
          armorTrim: '#fbbf24',
          helm: '#1e40af',
          glow: '#38bdf8',
        }
      : pClass === 'necromancer'
      ? {
          cape: '#3b0764',
          capeEdge: '#c084fc',
          armorDark: '#090d16',
          armorMain: '#4c1d95',
          armorTrim: '#cbd5e1',
          helm: '#1e1b4b',
          glow: '#c084fc',
        }
      : {
          // Swordsman
          cape: '#7f1d1d',
          capeEdge: '#f59e0b',
          armorDark: '#1e293b',
          armorMain: '#475569',
          armorTrim: '#fbbf24',
          helm: '#64748b',
          glow: '#38bdf8',
        };

  ctx.save();
  ctx.translate(x + lungeX, y + lungeY);

  if (isGhost) {
    ctx.globalAlpha = opts?.ghostAlpha ?? 0.45;
  }

  // 1. Ground Contact Shadow & Subtle Directional Ring (Feet firmly anchored at 0,0)
  if (!isGhost) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 21, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle tactical ground ring + facing chevron
    ctx.strokeStyle = palette.glow;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    const chevX = dirX * 19;
    const chevY = dirY * 9.5;
    ctx.fillStyle = palette.glow;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(chevX, chevY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Active Defensive Buff Auras (Iron Bulwark / Bone Armor / Windwalk)
    if (player.statusEffects && player.statusEffects.length > 0) {
      for (const buff of player.statusEffects) {
        if (buff.name === 'Iron Bulwark') {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, -16, 22, 26, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (buff.name === 'Bone Armor') {
          for (let b = 0; b < 3; b++) {
            const ba = gameTime * 4 + (b * Math.PI * 2) / 3;
            const bx = Math.cos(ba) * 20;
            const by = Math.sin(ba) * 10 - 14;
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.ellipse(bx, by, 3, 6, ba, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // Helper to draw flowing cloak/cape
  const drawCloak = () => {
    const billow = isMoving ? Math.sin(walkCycle * 0.5) * 4 - dirX * 5 : Math.sin(gameTime * 2) * 1.5;
    ctx.fillStyle = isGhost ? opts?.ghostColor || '#a855f7' : palette.cape;
    ctx.beginPath();
    ctx.moveTo(-7, -28 - bob);
    ctx.lineTo(7, -28 - bob);
    ctx.quadraticCurveTo(11 + billow, -14 - bob, 9 + billow, -4);
    ctx.lineTo(-9 + billow, -4);
    ctx.quadraticCurveTo(-11 + billow, -14 - bob, -7, -28 - bob);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isGhost ? '#e9d5ff' : palette.capeEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // If facing towards camera (South), cloak is behind body
  if (!facingBack) {
    drawCloak();
  }

  // 2. Articulated Boots & Greaves (Left & Right Legs)
  const legPositions = [
    { lx: -4.5 + strideL * 0.5, ly: strideL * 0.35 - liftL },
    { lx: 4.5 + strideR * 0.5, ly: strideR * 0.35 - liftR },
  ];
  for (const leg of legPositions) {
    // Thigh / Greave
    ctx.strokeStyle = isGhost ? opts?.ghostColor || '#38bdf8' : '#334155';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leg.lx * 0.7, -12 - bob);
    ctx.lineTo(leg.lx, -2 + leg.ly);
    ctx.stroke();

    // Knee cop & Armored Sabaton boot
    ctx.fillStyle = isGhost ? '#e0f2fe' : palette.armorMain;
    ctx.beginPath();
    ctx.ellipse(leg.lx + dirX * 1.5, -1.5 + leg.ly, 4.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // 3. Torso Cuirass / Robes / Brigandine (Matching image_a1d00a81.png)
  const torsoY = -20 - bob;
  if (pClass === 'mage') {
    // Royal Blue Wizard Robe with Thick Gold Trim & Collar Brooch
    const robeGrad = ctx.createLinearGradient(0, torsoY - 10, 0, -2);
    robeGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#38bdf8' : '#2563eb');
    robeGrad.addColorStop(0.55, isGhost ? '#1d4ed8' : '#1d4ed8');
    robeGrad.addColorStop(1, isGhost ? '#0f172a' : '#1e3a8a');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-8.5, torsoY - 8);
    ctx.lineTo(8.5, torsoY - 8);
    ctx.lineTo(11.5, -3);
    ctx.lineTo(-11.5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Gold-trimmed center robe opening & leather belt
    if (!facingBack) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-2, torsoY - 4);
      ctx.lineTo(-3, -3);
      ctx.moveTo(2, torsoY - 4);
      ctx.lineTo(3, -3);
      ctx.stroke();

      // Brown wizard sash belt
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-8.5, torsoY + 2, 17, 2.8);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-8.5, torsoY + 2, 17, 2.8);

      // Gold V-collar Mantle & Sapphire Gem Brooch
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8.5, torsoY - 7);
      ctx.lineTo(0, torsoY - 1);
      ctx.lineTo(8.5, torsoY - 7);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, torsoY - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  } else if (pClass === 'necromancer') {
    // Tattered Dark Purple & Charcoal Necromancer Vestments with Jagged Hem
    const necroGrad = ctx.createLinearGradient(0, torsoY - 10, 0, -2);
    necroGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#c084fc' : '#3b0764');
    necroGrad.addColorStop(0.6, '#1e1b4b');
    necroGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = necroGrad;
    ctx.beginPath();
    ctx.moveTo(-8.5, torsoY - 8);
    ctx.lineTo(8.5, torsoY - 8);
    ctx.lineTo(11, -3);
    ctx.lineTo(6, -6);
    ctx.lineTo(2, -2.5);
    ctx.lineTo(-2, -6);
    ctx.lineTo(-6, -2.5);
    ctx.lineTo(-11, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Inner violet tunic & knotted cord belt with bone skull clasp
    if (!facingBack) {
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.moveTo(-3.5, torsoY - 5);
      ctx.lineTo(3.5, torsoY - 5);
      ctx.lineTo(4.5, -4);
      ctx.lineTo(-4.5, -4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-8, torsoY + 2.5);
      ctx.lineTo(8, torsoY + 2.5);
      ctx.stroke();

      // Mini bone skull brooch at collar
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, torsoY - 4, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pClass === 'archer') {
    // Forest Green Ranger Tunic with Crossed Leather Straps & Belt
    const rangerGrad = ctx.createLinearGradient(-8, torsoY - 8, 8, torsoY + 9);
    rangerGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#4ade80' : '#22c55e');
    rangerGrad.addColorStop(0.45, '#15803d');
    rangerGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = rangerGrad;
    ctx.beginPath();
    ctx.moveTo(-8.5, torsoY - 8);
    ctx.lineTo(8.5, torsoY - 8);
    ctx.lineTo(7.5, torsoY + 9);
    ctx.lineTo(-7.5, torsoY + 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Crossed Brown Leather Chest Harness & Silver Buckle Belt
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-7, torsoY - 7);
    ctx.lineTo(6, torsoY + 4);
    ctx.moveTo(7, torsoY - 7);
    ctx.lineTo(-6, torsoY + 4);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, torsoY + 3.5, 16, 3);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(-2, torsoY + 3.3, 4, 3.4);
  } else {
    // SWORDSMAN: Full Polished Silver Plate Cuirass + Crimson & Gold Tabard
    const chestGrad = ctx.createLinearGradient(-9, torsoY - 9, 9, torsoY + 9);
    chestGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#38bdf8' : '#f1f5f9');
    chestGrad.addColorStop(0.45, isGhost ? '#0284c7' : '#94a3b8');
    chestGrad.addColorStop(1, '#334155');

    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.moveTo(-9, torsoY - 8);
    ctx.lineTo(9, torsoY - 8);
    ctx.lineTo(7.5, torsoY + 8);
    ctx.lineTo(-7.5, torsoY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Gold breastplate rivets & center ridge
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-5, torsoY - 3, 1.1, 0, Math.PI * 2);
    ctx.arc(5, torsoY - 3, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Crimson Heraldic Tabard & Gold-Buckled Belt
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-4, torsoY + 2, 8, 11);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, torsoY + 2, 8, 11);

    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-8, torsoY + 2.5, 16, 2.8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-2.2, torsoY + 2.2, 4.4, 3.4);
  }

  // 4. Layered Pauldrons (Shoulder Plates / Bone Skulls / Leather Pads)
  const shoulderPositions = [
    { sx: -9.8, sy: torsoY - 6 },
    { sx: 9.8, sy: torsoY - 6 },
  ];
  for (const sh of shoulderPositions) {
    if (pClass === 'necromancer') {
      // Bleached Horned Skull Pauldrons (Matching image_a1d00a81.png)
      ctx.fillStyle = isGhost ? opts?.ghostColor || '#c084fc' : '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(sh.sx, sh.sy, 5.2, 4.0, sh.sx < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dark skull eye sockets on pauldron
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(sh.sx - 1.4, sh.sy - 0.5, 1.0, 0, Math.PI * 2);
      ctx.arc(sh.sx + 1.4, sh.sy - 0.5, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Upward curved bone horns on shoulder skulls
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(sh.sx, sh.sy - 2.5);
      ctx.lineTo(sh.sx + (sh.sx < 0 ? -5.5 : 5.5), sh.sy - 8.5);
      ctx.lineTo(sh.sx + (sh.sx < 0 ? 2 : -2), sh.sy - 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (pClass === 'swordsman') {
      // Heavy Layered Silver Steel Pauldrons with Gold Rim
      ctx.fillStyle = isGhost ? opts?.ghostColor || '#38bdf8' : '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(sh.sx, sh.sy, 5.4, 4.2, sh.sx < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sh.sx, sh.sy - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isGhost
        ? opts?.ghostColor || '#38bdf8'
        : pClass === 'archer'
        ? '#166534'
        : '#1e40af';
      ctx.beginPath();
      ctx.ellipse(sh.sx, sh.sy, 4.6, 3.4, sh.sx < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.armorTrim;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Archer Quiver slung across back with feathered arrows
  if (pClass === 'archer') {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-7.5, torsoY - 14);
    ctx.lineTo(-2.5, torsoY - 14);
    ctx.lineTo(-4.5, torsoY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // White arrow fletchings sticking out
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6.5, torsoY - 14);
    ctx.lineTo(-9, torsoY - 19);
    ctx.moveTo(-5, torsoY - 14);
    ctx.lineTo(-6.5, torsoY - 20);
    ctx.moveTo(-3.5, torsoY - 14);
    ctx.lineTo(-4, torsoY - 19);
    ctx.stroke();
  }

  // 5. Head, Helm / Hood / Wizard Hat, & Facial / Visor Details (Matching image_a1d00a81.png)
  const headY = -33 - bob;

  if (pClass === 'swordsman') {
    // Polished Silver Knight Greathelm with Visor Slits & Crimson Plume
    const helmGrad = ctx.createRadialGradient(-2, headY - 2, 1, 0, headY, 7.5);
    helmGrad.addColorStop(0, isGhost ? '#38bdf8' : '#f8fafc');
    helmGrad.addColorStop(0.6, isGhost ? '#0284c7' : '#94a3b8');
    helmGrad.addColorStop(1, '#334155');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.arc(0, headY, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Flowing Crimson Helmet Plume
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, headY - 7);
    ctx.quadraticCurveTo(-5 * flipX, headY - 15, -11 * flipX, headY - 6);
    ctx.quadraticCurveTo(-5 * flipX, headY - 8, 0, headY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Visor Plate & Slits when facing forward/side
    if (!facingBack && !isGhost) {
      const vx = dirX * 2.5;
      const vy = headY + dirY * 1.2;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(vx - 4, vy - 0.5);
      ctx.lineTo(vx + 4, vy - 0.5);
      ctx.stroke();
      // Vertical respirator vents on faceplate
      ctx.lineWidth = 1.0;
      for (let s = -2; s <= 2; s += 2) {
        ctx.beginPath();
        ctx.moveTo(vx + s, vy + 1.5);
        ctx.lineTo(vx + s, vy + 4.2);
        ctx.stroke();
      }
    }
  } else if (pClass === 'archer') {
    // Forest Green Ranger Hood framing warm face
    ctx.fillStyle = isGhost ? opts?.ghostColor || '#4ade80' : '#15803d';
    ctx.beginPath();
    ctx.arc(0, headY, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Hood peak
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(-6.5, headY - 2);
    ctx.lineTo(-2 * flipX, headY - 10.5);
    ctx.lineTo(6.5, headY - 2);
    ctx.closePath();
    ctx.fill();

    if (!facingBack && !isGhost) {
      const fx = dirX * 2.2;
      const fy = headY + 0.8;
      // Face opening inside hood
      ctx.fillStyle = '#fdba74';
      ctx.beginPath();
      ctx.arc(fx, fy, 4.4, 0, Math.PI * 2);
      ctx.fill();
      // Emerald ranger eyes
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(fx - 1.6, fy - 0.4, 1.0, 0, Math.PI * 2);
      ctx.arc(fx + 1.6, fy - 0.4, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pClass === 'mage') {
    // Warm face + Wide-Brimmed Royal Blue Pointed Wizard Hat with Gold Band
    ctx.fillStyle = isGhost ? '#38bdf8' : !facingBack ? '#fdba74' : '#1e3a8a';
    ctx.beginPath();
    ctx.arc(0, headY, 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    if (!facingBack && !isGhost) {
      const fx = dirX * 2.4;
      const fy = headY + 1.0;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(fx - 1.6, fy, 1.15, 0, Math.PI * 2);
      ctx.arc(fx + 1.6, fy, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wide Wizard Hat Brim
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.ellipse(0, headY - 2.8, 10.8, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Gold Hat Band
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-5.8, headY - 5.8, 11.6, 2.4);

    // Tall Pointed Hat Cone with Curved Tip
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(-6.2, headY - 5.2);
    ctx.quadraticCurveTo(-1, headY - 16, 4.5 * flipX, headY - 17.5);
    ctx.quadraticCurveTo(3, headY - 11, 6.2, headY - 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  } else {
    // NECROMANCER: Deep Shadowed Cowl & Glowing Violet Eyes
    ctx.fillStyle = isGhost ? opts?.ghostColor || '#c084fc' : '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, headY, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Pointed dark hood peak
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(-7, headY - 1);
    ctx.lineTo(0, headY - 11);
    ctx.lineTo(7, headY - 1);
    ctx.closePath();
    ctx.fill();

    if (!facingBack && !isGhost) {
      const fx = dirX * 2.2;
      const fy = headY + 0.6;
      // Abyssal shadowed face cavity
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(fx, fy, 4.6, 0, Math.PI * 2);
      ctx.fill();
      // Glowing purple necromancer eyes
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(fx - 1.7, fy - 0.3, 1.35, 0, Math.PI * 2);
      ctx.arc(fx + 1.7, fy - 0.3, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // If facing away from camera (North), cloak renders over back of torso
  if (facingBack) {
    drawCloak();
  }

  // 6. Off-Hand Shield / Crackling Necro Flame / Arcane Hand
  const offHandX = -dirY * 9 - dirX * 2;
  const offHandY = torsoY + 1 + dirX * 4;
  if (pClass === 'swordsman') {
    // Heavy Steel-Rimmed Kite Shield (Matching image_a1d00a81.png)
    ctx.save();
    ctx.translate(offHandX, offHandY);
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-5.8, -6.8);
    ctx.lineTo(5.8, -6.8);
    ctx.lineTo(5.2, 1.8);
    ctx.lineTo(0, 8.5);
    ctx.lineTo(-5.2, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden shield boss & cross
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 6);
    ctx.moveTo(-3.6, -1);
    ctx.lineTo(3.6, -1);
    ctx.stroke();
    ctx.restore();
  } else if (pClass === 'necromancer') {
    // Crackling Violet Dark-Magic Flame in Right/Off-Hand (Matching image_a1d00a81.png)
    const floatY = offHandY - 2 + Math.sin(gameTime * 7) * 2.0;
    ctx.save();
    ctx.fillStyle = '#a855f7';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.arc(offHandX, floatY, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.moveTo(offHandX - 3.5, floatY + 2);
    ctx.quadraticCurveTo(offHandX - 4, floatY - 6, offHandX, floatY - 9 - Math.sin(gameTime * 12) * 2);
    ctx.quadraticCurveTo(offHandX + 4, floatY - 5, offHandX + 3.5, floatY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 7. Main-Hand Weapon & Active Attack / Cast Animation (Matching image_a1d00a81.png)
  const handAnchorX = dirY * 8 + dirX * 5;
  const handAnchorY = torsoY + 1 + dirY * 3;

  ctx.save();
  ctx.translate(handAnchorX, handAnchorY);
  ctx.rotate(isoAngle + swingAngle);

  if (pClass === 'swordsman') {
    // Broad Silver Knight Longsword with Golden Crossguard
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5.5, -1.6, 5.5, 3.2);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-6.5, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Cruciform Gold Crossguard
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-0.8, -7, 3.0, 14);

    // Polished Steel Blade with Center Ridge
    const bladeGrad = ctx.createLinearGradient(2, -3.5, 29, 3.5);
    bladeGrad.addColorStop(0, '#ffffff');
    bladeGrad.addColorStop(0.5, '#cbd5e1');
    bladeGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(2, -3.4);
    ctx.lineTo(24.5, -2.4);
    ctx.lineTo(31, 0);
    ctx.lineTo(24.5, 2.4);
    ctx.lineTo(2, 3.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.strokeStyle = player.isAttacking ? '#fef08a' : '#f8fafc';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();
  } else if (pClass === 'archer') {
    // Large Curved Wooden Recurve Longbow & Nocked Arrow (Matching image_a1d00a81.png)
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(2, 0, 14.5, -Math.PI * 0.46, Math.PI * 0.46);
    ctx.stroke();

    // Leather grip wrap
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(2, 0, 14.5, -0.22, 0.22);
    ctx.stroke();

    // Bowstring pulled back during attack
    const pull = player.isAttacking ? -5.5 : -0.5;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.lineTo(pull, 0);
    ctx.lineTo(4, 14);
    ctx.stroke();

    // Nocked arrow with steel broadhead
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pull, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(23.5, 0);
    ctx.lineTo(18, -2.6);
    ctx.lineTo(18, 2.6);
    ctx.closePath();
    ctx.fill();
  } else if (pClass === 'mage') {
    // Gnarled Twisted Wooden Wizard Staff with Glowing Cyan Orb & Sparkles (Matching image_a1d00a81.png)
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(21, 0);
    ctx.stroke();

    // Curved wooden crook cradling the orb
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(23.5, 0, 4.8, -Math.PI * 0.78, Math.PI * 0.65);
    ctx.stroke();

    // Glowing Cyan Orb + Twinkling Star Sparkles
    ctx.fillStyle = player.isAttacking ? '#fb923c' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(24, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(23, -1, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Tiny orbiting arcane sparkles
    const spAngle = gameTime * 4;
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(24 + Math.cos(spAngle) * 7 - 1, Math.sin(spAngle) * 7 - 1, 2, 2);
    ctx.fillRect(24 - Math.cos(spAngle * 0.8) * 6.5 - 1, -Math.sin(spAngle * 0.8) * 6.5 - 1, 2, 2);
  } else {
    // NECROMANCER: Gnarled Dark Staff Topped with a Large Bleached Human Skull (Matching image_a1d00a81.png)
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(21, 0);
    ctx.stroke();

    // Large Bleached Skull Crown at Staff Tip
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(23.5, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Skull eye sockets & nasal cavity
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(24.5, -1.4, 1.1, 0, Math.PI * 2);
    ctx.arc(24.5, 1.4, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // 8. Twin Cleave / Melee Attack Sweeping Dual Crescent Ribbons
  if (player.isAttacking && !isGhost) {
    ctx.save();
    ctx.translate(0, -18);
    const arcSpan = 1.65;
    const startA = isoAngle - arcSpan * 0.5;
    const endA = isoAngle + arcSpan * 0.5;

    // Outer weapon energy ribbon
    ctx.strokeStyle =
      pClass === 'swordsman'
        ? 'rgba(254, 240, 138, 0.92)'
        : pClass === 'archer'
        ? 'rgba(74, 222, 128, 0.85)'
        : pClass === 'mage'
        ? 'rgba(56, 189, 248, 0.9)'
        : 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 22, 0, startA, endA);
    ctx.stroke();

    // Secondary Twin Cleave inner crimson/gold arc
    ctx.strokeStyle = pClass === 'swordsman' ? 'rgba(249, 115, 22, 0.78)' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 33, 17, 0, startA + 0.15, endA - 0.1);
    ctx.stroke();
    ctx.restore();
  }

  // 9. Hit Flash Overlay
  if ((player.hitFlashTimer || 0) > 0 && !isGhost) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, -18 - bob, 13, 21, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 10. Floating Player Nameplate
  if (player.playerName && !isGhost) {
    ctx.font = 'bold 11px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillText(player.playerName, 1, -50 - bob);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(player.playerName, 0, -51 - bob);
  }

  ctx.restore();
}

export function drawEnemyRig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  enemy: EnemyEntity,
  gameTime: number
): void {
  const isBoss = enemy.archetype === 'dungeon_lord';
  const isBrute = enemy.archetype === 'abyssal_brute';
  const isStalker = enemy.archetype === 'shadow_stalker';
  const isArcher = enemy.archetype === 'goblin_archer';
  const isNecro = enemy.archetype === 'necromancer';

  const scale = isBoss ? 1.65 : isBrute ? 1.32 : enemy.isElite ? 1.15 : 1.0;
  const isoAngle = worldAngleToIsoAngle(enemy.facingAngle);
  const dirX = Math.cos(isoAngle);
  const dirY = Math.sin(isoAngle);
  const isMoving = enemy.aiState === 'pursuit' || enemy.aiState === 'reposition';
  const isWindup = enemy.aiState === 'windup';
  const isAttacking = enemy.aiState === 'attack';

  const walkPhase = gameTime * (isStalker ? 13 : isBrute ? 6.5 : 9) + enemy.x * 0.05;
  const stride = isMoving ? Math.sin(walkPhase) * 4.5 : 0;
  const bob = isNecro
    ? Math.sin(gameTime * 3.5 + enemy.x) * 4.5 // Floating lich levitation
    : isMoving
    ? Math.abs(Math.sin(walkPhase)) * 2.5
    : Math.sin(gameTime * 2.8 + enemy.y) * 1.2;

  const isHit = enemy.isHitFlashTimer > 0;
  const hitRecoilX = isHit ? -dirX * 3.5 : 0;
  const hitRecoilY = isHit ? -dirY * 2.5 : 0;

  ctx.save();
  ctx.translate(x + hitRecoilX, y + hitRecoilY);

  // 1. Ground Shadow & Elite / Boss Aura Rings
  const shadowRx = enemy.size * 1.15;
  const shadowRy = enemy.size * 0.58;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 2, shadowRx * 1.1, shadowRy * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isElite && !isBoss) {
    const eliteColor =
      enemy.eliteModifier === 'Molten'
        ? '#f97316'
        : enemy.eliteModifier === 'Frozen'
        ? '#38bdf8'
        : enemy.eliteModifier === 'Arcane'
        ? '#c084fc'
        : enemy.eliteModifier === 'Berserker'
        ? '#ef4444'
        : '#facc15';

    ctx.strokeStyle = eliteColor;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 1, shadowRx * 1.25, shadowRy * 1.25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isBoss) {
    const bossAuraColor = enemy.isEnraged
      ? 'rgba(239, 68, 68, 0.85)'
      : (enemy.phase || 1) >= 2
      ? 'rgba(249, 115, 22, 0.75)'
      : 'rgba(192, 132, 252, 0.65)';
    ctx.strokeStyle = bossAuraColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, shadowRx * 1.38, shadowRy * 1.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Abyssal Sigil nodes around the Dungeon Lord
    const nodeCount = enemy.isEnraged ? 6 : 4;
    for (let n = 0; n < nodeCount; n++) {
      const na = gameTime * 2.2 + (n * Math.PI * 2) / nodeCount;
      const nx = Math.cos(na) * shadowRx * 1.38;
      const ny = Math.sin(na) * shadowRy * 1.38 + 1;
      ctx.fillStyle = enemy.isEnraged ? '#fef08a' : '#f97316';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Windup Danger Flash Ring around feet before enemy strikes
  if (isWindup) {
    const pulse = 0.5 + Math.sin(gameTime * 24) * 0.4;
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowRx * 1.15, shadowRy * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.scale(scale, scale);

  // 2. Archetype-Specific Articulated Monster Anatomy
  if (enemy.archetype === 'skeleton_warrior') {
    // Articulated Bleached Bone Legs
    ctx.strokeStyle = isHit ? '#ffffff' : '#cbd5e1';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-3.5, -11 - bob);
    ctx.lineTo(-4.5 + stride * 0.5, -1 + stride * 0.3);
    ctx.moveTo(3.5, -11 - bob);
    ctx.lineTo(4.5 - stride * 0.5, -1 - stride * 0.3);
    ctx.stroke();

    // Pelvis & Spine + Ribcage
    ctx.fillStyle = isHit ? '#ffffff' : '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, -12 - bob, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tattered crypt tunic shred
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-5, -12 - bob);
    ctx.lineTo(5, -12 - bob);
    ctx.lineTo(3, -5 - bob);
    ctx.lineTo(-4, -6 - bob);
    ctx.closePath();
    ctx.fill();

    // Spine & Individual Ribs
    ctx.strokeStyle = isHit ? '#ffffff' : '#e2e8f0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -12 - bob);
    ctx.lineTo(0, -25 - bob);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    for (let r = 0; r < 3; r++) {
      const ry = -16 - r * 3.2 - bob;
      ctx.beginPath();
      ctx.moveTo(-6, ry + 1);
      ctx.quadraticCurveTo(0, ry - 1.5, 6, ry + 1);
      ctx.stroke();
    }

    // Iron Shoulder Pad & Skull with Crimson Eye Sockets
    ctx.fillStyle = isHit ? '#ffffff' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -30 - bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -26 - bob, 6, 3.2); // Jawbone

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(dirX * 2 - 2, -30.5 - bob, 1.4, 0, Math.PI * 2);
    ctx.arc(dirX * 2 + 2, -30.5 - bob, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Battered Round Buckler Shield on Off-Hand
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-7, -18 - bob, 4.5, 6.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Notched Bone/Iron Scimitar in Main Hand
    ctx.save();
    ctx.translate(7, -19 - bob);
    const swing = isWindup ? -0.9 : isAttacking ? 1.1 : 0;
    ctx.rotate(isoAngle * 0.5 + swing);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.quadraticCurveTo(12, -5, 19, 1);
    ctx.quadraticCurveTo(11, 2, 0, 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (isStalker) {
    // SHADOW STALKER: Hunched Wraith Assassin with drifting tendrils & dual void daggers
    for (let t = 0; t < 4; t++) {
      const txOff = (t - 1.5) * 4 + Math.sin(gameTime * 8 + t) * 2.5;
      ctx.fillStyle = 'rgba(88, 28, 135, 0.55)';
      ctx.beginPath();
      ctx.moveTo(txOff - 3, -14 - bob);
      ctx.lineTo(txOff + 3, -14 - bob);
      ctx.lineTo(txOff + Math.sin(gameTime * 6 + t) * 3, -1);
      ctx.closePath();
      ctx.fill();
    }

    // Hunched Cloaked Body
    const bodyGrad = ctx.createLinearGradient(0, -32 - bob, 0, -6 - bob);
    bodyGrad.addColorStop(0, isHit ? '#ffffff' : '#4c1d95');
    bodyGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(dirX * 3, -33 - bob);
    ctx.quadraticCurveTo(12, -22 - bob, 8, -7 - bob);
    ctx.lineTo(-8, -7 - bob);
    ctx.quadraticCurveTo(-12, -22 - bob, dirX * 3, -33 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3 Glowing Eldritch Eyes under Deep Hood
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(dirX * 3 - 2.2, -26 - bob, 1.3, 0, Math.PI * 2);
    ctx.arc(dirX * 3 + 2.2, -26 - bob, 1.3, 0, Math.PI * 2);
    ctx.arc(dirX * 3, -28.2 - bob, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Dual Curved Void Daggers
    const daggerSwing = isWindup ? -0.7 : isAttacking ? 1.2 : 0.2;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 8, -17 - bob);
      ctx.rotate(isoAngle * 0.4 + side * daggerSwing);
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(0, -1.5);
      ctx.quadraticCurveTo(9, side * 4, 14, 0);
      ctx.lineTo(0, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (isArcher) {
    // GOBLIN ARCHER: Wiry hooded skirmisher with pointed ears, quiver & drawn bow
    // Boots & Wiry Legs
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3.5, -10 - bob);
    ctx.lineTo(-4.5 + stride * 0.5, -1 + stride * 0.3);
    ctx.moveTo(3.5, -10 - bob);
    ctx.lineTo(4.5 - stride * 0.5, -1 - stride * 0.3);
    ctx.stroke();

    // Brigandine Leather Jerkin
    ctx.fillStyle = isHit ? '#ffffff' : '#713f12';
    ctx.beginPath();
    ctx.moveTo(-7, -23 - bob);
    ctx.lineTo(7, -23 - bob);
    ctx.lineTo(6, -9 - bob);
    ctx.lineTo(-6, -9 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Quiver with Red-Fletched Arrows
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-7, -28 - bob, 3.5, 9);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -28 - bob);
    ctx.lineTo(-8, -32 - bob);
    ctx.moveTo(-4.5, -28 - bob);
    ctx.lineTo(-5.5, -33 - bob);
    ctx.stroke();

    // Head, Long Pointed Goblin Ears, & Hood
    ctx.fillStyle = isHit ? '#ffffff' : '#4d7c0f';
    ctx.beginPath();
    ctx.arc(0, -27 - bob, 5.2, 0, Math.PI * 2);
    ctx.fill();
    // Pointed Ears
    ctx.beginPath();
    ctx.moveTo(-4, -27 - bob);
    ctx.lineTo(-10, -29 - bob);
    ctx.lineTo(-4, -25 - bob);
    ctx.moveTo(4, -27 - bob);
    ctx.lineTo(10, -29 - bob);
    ctx.lineTo(4, -25 - bob);
    ctx.fill();

    // Glowing Amber Eyes
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(dirX * 2 - 1.8, -27 - bob, 1.2, 0, Math.PI * 2);
    ctx.arc(dirX * 2 + 1.8, -27 - bob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Drawn Bone Shortbow aimed along facingAngle
    ctx.save();
    ctx.translate(dirX * 6, -18 - bob + dirY * 3);
    ctx.rotate(isoAngle);
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    if (isWindup || isAttacking) {
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(13, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else if (isBrute) {
    // ABYSSAL BRUTE: Hulking Juggernaut with Molten Core, Spiked Pauldrons & War-Maul
    // Thick Pillar Legs
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-6, -13 - bob);
    ctx.lineTo(-7 + stride * 0.4, -1 + stride * 0.25);
    ctx.moveTo(6, -13 - bob);
    ctx.lineTo(7 - stride * 0.4, -1 - stride * 0.25);
    ctx.stroke();

    // Broad Obsidian-Iron Torso
    const bruteGrad = ctx.createLinearGradient(-13, -32 - bob, 13, -10 - bob);
    bruteGrad.addColorStop(0, isHit ? '#ffffff' : '#475569');
    bruteGrad.addColorStop(0.5, isHit ? '#fecaca' : '#1e293b');
    bruteGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bruteGrad;
    ctx.beginPath();
    ctx.moveTo(-13, -30 - bob);
    ctx.lineTo(13, -30 - bob);
    ctx.lineTo(10, -11 - bob);
    ctx.lineTo(-10, -11 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Glowing Molten Furnace Core in Chest
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(0, -26 - bob);
    ctx.lineTo(4.5, -20 - bob);
    ctx.lineTo(0, -14 - bob);
    ctx.lineTo(-4.5, -20 - bob);
    ctx.closePath();
    ctx.fill();

    // Massive Spiked Pauldrons
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(side * 13, -27 - bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Iron Spike
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(side * 12, -31 - bob);
      ctx.lineTo(side * 18, -38 - bob);
      ctx.lineTo(side * 16, -28 - bob);
      ctx.closePath();
      ctx.fill();
    }

    // Horned Iron Juggernaut Helm
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -34 - bob, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-3.5, -35 - bob, 7, 2);

    // Colossal Two-Handed Spiked War-Maul
    ctx.save();
    ctx.translate(11, -21 - bob);
    const maulSwing = isWindup ? -1.1 : isAttacking ? 1.3 : 0.15;
    ctx.rotate(isoAngle * 0.35 + maulSwing);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();

    // Heavy Iron Maul Head
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.fillRect(16, -7, 8, 14);
    ctx.strokeRect(16, -7, 8, 14);
    ctx.restore();
  } else if (isNecro) {
    // NECROMANCER CULTIST: Levitating Dark Lich with Skull Mask & Ritual Staff
    const robeGrad = ctx.createLinearGradient(0, -34 - bob, 0, -3 - bob);
    robeGrad.addColorStop(0, isHit ? '#ffffff' : '#581c87');
    robeGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-7, -28 - bob);
    ctx.lineTo(7, -28 - bob);
    ctx.lineTo(11, -4 - bob);
    ctx.lineTo(-11, -4 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Skull Mask & Cowled Hood
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -33 - bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(-2, -33 - bob, 1.4, 0, Math.PI * 2);
    ctx.arc(2, -33 - bob, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Necrotic Ritual Staff
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, -6 - bob);
    ctx.lineTo(11, -38 - bob);
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(11, -40 - bob, 3.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // DUNGEON LORD (BOSS): Towering Abyssal Overlord with Flaming Dread-Plate, Sweeping Horns & Great-Cleaver
    // Royal Tattered War-Cloak
    ctx.fillStyle = enemy.isEnraged ? '#991b1b' : '#450a0a';
    ctx.beginPath();
    ctx.moveTo(-11, -32 - bob);
    ctx.lineTo(11, -32 - bob);
    ctx.lineTo(16 + Math.sin(gameTime * 4) * 3, -3);
    ctx.lineTo(-16 + Math.sin(gameTime * 4) * 3, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Armored Sabatons & Greaves
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-5.5, -13 - bob);
    ctx.lineTo(-6.5 + stride * 0.4, -1);
    ctx.moveTo(5.5, -13 - bob);
    ctx.lineTo(6.5 - stride * 0.4, -1);
    ctx.stroke();

    // Abyssal Dread-Plate Cuirass
    const lordGrad = ctx.createLinearGradient(-12, -34 - bob, 12, -12 - bob);
    lordGrad.addColorStop(0, isHit ? '#ffffff' : '#334155');
    lordGrad.addColorStop(0.5, isHit ? '#fca5a5' : '#0f172a');
    lordGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = lordGrad;
    ctx.beginPath();
    ctx.moveTo(-13, -32 - bob);
    ctx.lineTo(13, -32 - bob);
    ctx.lineTo(9, -12 - bob);
    ctx.lineTo(-9, -12 - bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Blazing Hellfire Rib-Slits on Chest
    ctx.fillStyle = enemy.isEnraged ? '#fef08a' : '#f97316';
    for (let r = 0; r < 3; r++) {
      ctx.fillRect(-5, -28 + r * 4 - bob, 10, 1.8);
    }

    // Crowned Demon-Helm & Twin Sweeping Horns
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -37 - bob, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-5, -39 - bob);
    ctx.quadraticCurveTo(-16, -46 - bob, -12, -54 - bob);
    ctx.moveTo(5, -39 - bob);
    ctx.quadraticCurveTo(16, -46 - bob, 12, -54 - bob);
    ctx.stroke();

    // Glowing Abyssal Eyes
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-2.5, -37 - bob, 1.7, 0, Math.PI * 2);
    ctx.arc(2.5, -37 - bob, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Colossal Flaming Dread-Cleaver
    ctx.save();
    ctx.translate(12, -23 - bob);
    const bossSwing = isWindup ? -1.2 : isAttacking ? 1.4 : 0.1;
    ctx.rotate(isoAngle * 0.35 + bossSwing);
    const cleaverGrad = ctx.createLinearGradient(0, -4, 28, 4);
    cleaverGrad.addColorStop(0, '#991b1b');
    cleaverGrad.addColorStop(0.6, '#f97316');
    cleaverGrad.addColorStop(1, '#fef08a');
    ctx.fillStyle = cleaverGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(24, -6);
    ctx.lineTo(30, 1);
    ctx.lineTo(20, 6);
    ctx.lineTo(-4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // End scale

  // 3. Status Effect Visual Overlays (Chilled Frost Crystals / Stun Stars / Burn Flames)
  const topOffset = isBoss ? -96 : isBrute ? -60 : -46;
  for (const status of enemy.statusEffects) {
    if (status.id === 'chill' || status.id === 'pinned') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(0, -24);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (status.id === 'stun') {
      for (let s = 0; s < 3; s++) {
        const sa = gameTime * 6 + (s * Math.PI * 2) / 3;
        const sx = Math.cos(sa) * 11;
        const sy = Math.sin(sa) * 4 + topOffset + 8;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Crisp Overhead Health Bar & Elite/Boss Title
  const barW = isBoss ? 86 : enemy.isElite ? 48 : 36;
  const barH = isBoss ? 6 : 4.5;
  const barY = topOffset - (enemy.isElite || isBoss ? 10 : 4);

  if (isBoss || enemy.isElite) {
    ctx.font = isBoss
      ? 'bold 11px "Cinzel", serif'
      : 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    const label = isBoss
      ? `${enemy.name}${enemy.isEnraged ? ' [ENRAGED]' : ''}`
      : `${enemy.eliteModifier || 'Elite'} ${enemy.name}`;
    ctx.fillText(label, 1, barY - 4);
    ctx.fillStyle = isBoss ? '#fca5a5' : '#fde047';
    ctx.fillText(label, 0, barY - 5);
  }

  ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
  ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

  const hpPct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
  ctx.fillStyle = isBoss ? '#dc2626' : enemy.isElite ? '#f59e0b' : '#ef4444';
  ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

  ctx.restore();
}

export interface NPCIdlePose {
  isMoving: boolean;
  headLookX: number; // Horizontal head turn & gaze offset (-3.4 .. +3.4 px)
  headNodY: number; // Vertical head nod offset (-1.5 .. +3.2 px)
  headTilt: number; // Subtle head tilt in radians
  torsoSwayX: number; // Gentle weight shift while standing
  breathY: number; // Chest breathing bob
  rightArmLift: number; // Hand/arm gesture offset
  isBlinking: boolean;
}

/**
 * Computes deterministic, life-like standing idle animation offsets for Town-1 NPCs
 * (looking around left/right, nodding, breathing, blinking, and greeting gestures).
 */
export function computeNPCIdlePose(
  npc: NPCEntity,
  gameTime: number,
  isNear: boolean = false
): NPCIdlePose {
  const speed = Math.hypot(npc.vx || 0, npc.vy || 0);
  const isMoving = speed > 4;
  const seed = (npc.x * 0.037 + npc.y * 0.053) % (Math.PI * 2);

  if (isMoving) {
    const isoAngle = worldAngleToIsoAngle(npc.facingAngle || 0);
    return {
      isMoving: true,
      headLookX: Math.cos(isoAngle) * 1.6,
      headNodY: 0,
      headTilt: 0,
      torsoSwayX: 0,
      breathY: 0,
      rightArmLift: 0,
      isBlinking: false,
    };
  }

  // Combine simulation-driven headYaw/headPitch with smooth procedural idle cycles
  const t = gameTime + seed;
  const cycleWindow = t % 7.5;
  const autoLookWindow = cycleWindow >= 1.2 && cycleWindow < 4.4;
  const autoNodWindow = cycleWindow >= 4.6 && cycleWindow < 6.8;

  let yaw = npc.headYaw ?? 0;
  let pitch = npc.headPitch ?? 0;

  if (Math.abs(yaw) < 0.02 && Math.abs(pitch) < 0.02) {
    if (isNear) {
      // Friendly double-nod & attentive gaze when player is nearby
      yaw = Math.sin(t * 1.8) * 0.25;
      pitch = Math.max(0, Math.sin(t * 6.0)) * 0.85;
    } else if (autoLookWindow) {
      // Smoothly pan gaze left, pause, pan right across the town center
      yaw = Math.sin((cycleWindow - 1.2) * (Math.PI * 2 / 3.2)) * 0.9;
      pitch = Math.sin(t * 2.2) * 0.12;
    } else if (autoNodWindow) {
      // Thoughtful double-nod while standing
      yaw = Math.sin(seed) * 0.25;
      pitch = Math.max(-0.1, Math.sin((cycleWindow - 4.6) * 6.5)) * 0.85;
    } else {
      yaw = Math.sin(t * 0.9) * 0.18;
      pitch = Math.sin(t * 1.8) * 0.12;
    }
  }

  // Blend in facing direction slightly when not actively scanning far left/right
  const isoFacingX = Math.cos(worldAngleToIsoAngle(npc.facingAngle || 0));
  const headLookX = Math.max(-3.4, Math.min(3.4, yaw * 3.1 + isoFacingX * 0.65));
  const headNodY = Math.max(-1.6, Math.min(3.2, pitch * 2.9));
  const headTilt = yaw * 0.09 - pitch * 0.04;
  const torsoSwayX = Math.sin(t * 1.35) * 0.65;
  const breathY = Math.sin(t * 2.6) * 1.15;

  // Arm gesture: wave when greeting player or subtle role gesture when idle
  let rightArmLift = 0;
  if (isNear || npc.idleAction === 'wave_greet') {
    rightArmLift = 3.5 + Math.sin(gameTime * 8.5 + seed) * 2.2;
  } else if (npc.idleAction === 'nodding' || autoNodWindow) {
    rightArmLift = 1.2 + Math.max(0, Math.sin(t * 5.5)) * 1.4;
  } else if (npc.idleAction === 'inspect_work') {
    rightArmLift = 2.0 + Math.sin(t * 4.2) * 1.6;
  }

  // Natural periodic blink (~130ms every 3.8 seconds)
  const blinkCycle = (gameTime + seed * 1.7) % 3.8;
  const isBlinking = blinkCycle > 3.66;

  return {
    isMoving: false,
    headLookX,
    headNodY,
    headTilt,
    torsoSwayX,
    breathY,
    rightArmLift,
    isBlinking,
  };
}

export function drawNPCRig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  npc: NPCEntity,
  isNear: boolean,
  gameTime: number,
  isNight: boolean = false
): void {
  const pose = computeNPCIdlePose(npc, gameTime, isNear);
  const isMoving = pose.isMoving;
  const walkCycle = isMoving ? gameTime * 8.5 + npc.x * 0.05 : 0;
  const strideL = isMoving ? Math.sin(walkCycle) * 4.5 : 0;
  const strideR = isMoving ? -Math.sin(walkCycle) * 4.5 : 0;
  const bob = isMoving ? Math.abs(Math.sin(walkCycle)) * 2.1 : pose.breathY;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Interactive golden aura ring when player is near or hovering
  ctx.strokeStyle = isNear ? '#fde047' : npc.color;
  ctx.globalAlpha = isNear ? 0.95 : 0.55;
  ctx.lineWidth = isNear ? 2.4 : 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 1, isNear ? 21 : 15, isNear ? 10.5 : 7.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Walking Boots / Feet
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(-3.5 + strideL * 0.45, -1, 3.4, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(3.5 + strideR * 0.45, -1, 3.4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Role-specific Robes / Apron / Tunic (with subtle idle torso sway)
  const swayX = pose.torsoSwayX;
  const robeGrad = ctx.createLinearGradient(swayX, -34 - bob, 0, -2);
  robeGrad.addColorStop(0, npc.color);
  robeGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(-8 + swayX, -28 - bob);
  ctx.lineTo(8 + swayX, -28 - bob);
  ctx.lineTo(10, -2);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Articulated Arms & Sleeves (animate with walk swing or idle greeting/work gestures)
  const leftArmSwing = isMoving ? -strideL * 0.5 : Math.sin(gameTime * 2.1 + npc.y) * 0.6;
  const rightArmSwing = isMoving ? -strideR * 0.5 : -pose.rightArmLift;

  ctx.strokeStyle = npc.color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left arm
  ctx.moveTo(-7.5 + swayX, -25 - bob);
  ctx.lineTo(-10.5 + swayX, -15 - bob + leftArmSwing);
  // Right arm
  ctx.moveTo(7.5 + swayX, -25 - bob);
  ctx.lineTo(10.5 + swayX, -15 - bob + rightArmSwing);
  ctx.stroke();

  // Warm hands
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(-10.5 + swayX, -14.5 - bob + leftArmSwing, 1.8, 0, Math.PI * 2);
  ctx.arc(10.5 + swayX, -14.5 - bob + rightArmSwing, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Role torso details & tools
  if (npc.role === 'elder' || npc.role === 'healer') {
    // Hooded mantle + staff (staff gently bobs with right hand gesture)
    const staffBob = !isMoving ? pose.rightArmLift * 0.45 : 0;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10.5 + swayX, -2 - staffBob);
    ctx.lineTo(10.5 + swayX, -38 - bob - staffBob);
    ctx.stroke();
    ctx.fillStyle = npc.role === 'healer' ? '#34d399' : '#fde047';
    ctx.beginPath();
    ctx.arc(10.5 + swayX, -40 - bob - staffBob, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.role === 'blacksmith') {
    // Heavy leather smithing apron & animated forge hammer
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6 + swayX, -24 - bob, 12, 16);
    const hammerY = -26 - bob + rightArmSwing * 0.7;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(10.5 + swayX, -15 - bob + rightArmSwing);
    ctx.lineTo(11.5 + swayX, hammerY + 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8.5 + swayX, hammerY - 2, 6.5, 4);
  } else if (npc.role === 'shop' || npc.role === 'storage') {
    // Merchant gold sash & coin pouch
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-7.5 + swayX, -16 - bob, 15, 2.2);
  }

  // Head, Facial Features (Looking Around & Nodding) & Role Headgear
  const headX = swayX + pose.headLookX * 0.65;
  const headY = -33 - bob + pose.headNodY;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(pose.headTilt);

  // Head base
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Expressive Eyes & Eyebrows that shift horizontally when looking around and dip when nodding
  const gazeX = Math.max(-2.4, Math.min(2.4, pose.headLookX * 0.75));
  const gazeY = Math.max(-1.0, Math.min(1.5, pose.headNodY * 0.35));

  // Eyebrows
  ctx.strokeStyle = npc.role === 'elder' ? '#cbd5e1' : '#451a03';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(gazeX - 3.3, gazeY - 2.2);
  ctx.lineTo(gazeX - 1.1, gazeY - 2.0);
  ctx.moveTo(gazeX + 1.1, gazeY - 2.0);
  ctx.lineTo(gazeX + 3.3, gazeY - 2.2);
  ctx.stroke();

  // Eyes (with natural periodic blink)
  ctx.fillStyle = '#0f172a';
  if (pose.isBlinking) {
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(gazeX - 3.0, gazeY - 0.3);
    ctx.lineTo(gazeX - 1.2, gazeY - 0.3);
    ctx.moveTo(gazeX + 1.2, gazeY - 0.3);
    ctx.lineTo(gazeX + 3.0, gazeY - 0.3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(gazeX - 2.1, gazeY - 0.3, 1.05, 0, Math.PI * 2);
    ctx.arc(gazeX + 2.1, gazeY - 0.3, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // Role-specific beards & headgear attached to the nodding/turning head
  if (npc.role === 'elder') {
    // Flowing silver sage beard that bobs with head nods
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-3.5, 2.0);
    ctx.quadraticCurveTo(gazeX * 0.4, 8.5, 0, 9.2);
    ctx.quadraticCurveTo(gazeX * 0.4, 8.5, 3.5, 2.0);
    ctx.closePath();
    ctx.fill();
    // Golden sage circlet
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -1.5, 5.8, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (npc.role === 'healer') {
    // Serene white-and-gold abbey veil / circlet
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -1.5, 6.2, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else if (npc.role === 'blacksmith') {
    // Thick dark smith's beard
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(gazeX * 0.3, 3.2, 3.6, 0, Math.PI);
    ctx.fill();
  } else if (npc.role === 'shop' || npc.role === 'storage') {
    // Merchant velvet cap & feather
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -4.2, 6.8, 2.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  } else {
    // Villager/Guide rustic hair or cap crest
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -1.8, 5.9, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  }

  ctx.restore();

  // Handheld Warm Night Lantern when evening/dusk/night falls
  if (isNight && npc.carriesLantern !== false) {
    const lanternSwing = isMoving ? Math.sin(walkCycle) * 2.5 : Math.sin(gameTime * 3) * 0.8;
    const lx = -11 + swayX + lanternSwing;
    const ly = -16 - bob;
    // Iron handle
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7 + swayX, -21 - bob);
    ctx.lineTo(lx, ly - 5);
    ctx.stroke();

    // Glowing lantern cage (fast translucent halo instead of shadowBlur)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.arc(lx, ly - 0.5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(lx - 2.8, ly - 4, 5.6, 7);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(lx - 2.8, ly - 4, 5.6, 7);
  }

  // Nameplate & Role Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px "Cinzel", serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillText(npc.name, 1, -51 - bob);
  ctx.fillStyle = '#fef08a';
  ctx.fillText(npc.name, 0, -52 - bob);

  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`<${npc.title}>`, 0, -42 - bob);

  if (isNear) {
    const promptY = -68 + Math.sin(gameTime * 6) * 2.5;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-44, promptY - 12, 88, 16);
    ctx.strokeRect(-44, promptY - 12, 88, 16);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('[E / Click] Talk', 0, promptY - 1);
  } else if (npc.activityText && !isMoving) {
    // Quiet ambient activity caption when paused at a waypoint
    ctx.font = 'italic 8.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.fillText(npc.activityText, 0, -62 - bob);
  }

  ctx.restore();
}

export function drawSummonRig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  summon: SummonEntity,
  gameTime: number
): void {
  const bob = Math.sin(gameTime * 6 + summon.x) * 1.8;
  const isoAngle = worldAngleToIsoAngle(summon.facingAngle);

  ctx.save();
  ctx.translate(x, y);

  // Allied spectral cyan/violet summoning ring on ground
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 1, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Spectral Bone Legs & Ribcage
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3, -9 - bob);
  ctx.lineTo(-4, -1);
  ctx.moveTo(3, -9 - bob);
  ctx.lineTo(4, -1);
  ctx.moveTo(0, -9 - bob);
  ctx.lineTo(0, -21 - bob);
  ctx.stroke();

  // Spectral Pauldrons & Skull
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.arc(0, -25 - bob, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-1.8, -25 - bob, 1.2, 0, Math.PI * 2);
  ctx.arc(1.8, -25 - bob, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Spectral Runed Blade
  ctx.save();
  ctx.translate(6, -16 - bob);
  ctx.rotate(isoAngle * 0.4);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(13, -4);
  ctx.stroke();
  ctx.restore();

  // Minion HP bar
  const barW = 26;
  const hpPct = Math.max(0, Math.min(1, summon.health / summon.maxHealth));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(-barW / 2, -36 - bob, barW, 3);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-barW / 2, -36 - bob, barW * hpPct, 3);

  ctx.restore();
}
