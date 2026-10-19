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

  // 3. Torso Cuirass / Robes / Brigandine
  const torsoY = -20 - bob;
  if (pClass === 'mage' || pClass === 'necromancer') {
    // Layered Arcanist / Necromancer Robe Skirt + Surcoat
    const robeGrad = ctx.createLinearGradient(0, torsoY - 10, 0, -3);
    robeGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#c084fc' : palette.armorMain);
    robeGrad.addColorStop(1, isGhost ? '#3b0764' : palette.armorDark);
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-8, torsoY - 8);
    ctx.lineTo(8, torsoY - 8);
    ctx.lineTo(10, -4);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = palette.armorTrim;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Central runic stole hanging down the front
    if (!facingBack) {
      ctx.fillStyle = palette.cape;
      ctx.fillRect(-2.5, torsoY - 6, 5, 16);
      ctx.strokeStyle = palette.armorTrim;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-2.5, torsoY - 6, 5, 16);
    }
  } else {
    // Armored Cuirass + Battle Tabard + Belt (Swordsman / Archer)
    const chestGrad = ctx.createLinearGradient(-9, torsoY - 9, 9, torsoY + 9);
    chestGrad.addColorStop(0, isGhost ? opts?.ghostColor || '#38bdf8' : '#94a3b8');
    chestGrad.addColorStop(0.5, isGhost ? '#0284c7' : palette.armorMain);
    chestGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.moveTo(-8.5, torsoY - 8);
    ctx.lineTo(8.5, torsoY - 8);
    ctx.lineTo(7, torsoY + 8);
    ctx.lineTo(-7, torsoY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Tabard & Gilded Belt
    ctx.fillStyle = palette.cape;
    ctx.fillRect(-4, torsoY - 2, 8, 12);
    ctx.fillStyle = palette.armorTrim;
    ctx.fillRect(-7.5, torsoY + 4, 15, 2.5);
  }

  // 4. Layered Pauldrons (Shoulder Plates)
  const shoulderPositions = [
    { sx: -9.5, sy: torsoY - 6 },
    { sx: 9.5, sy: torsoY - 6 },
  ];
  for (const sh of shoulderPositions) {
    ctx.fillStyle = isGhost ? opts?.ghostColor || '#38bdf8' : palette.helm;
    ctx.beginPath();
    ctx.ellipse(sh.sx, sh.sy, 4.8, 3.6, sh.sx < 0 ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.armorTrim;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (pClass === 'necromancer') {
      // Bone spike on pauldron
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(sh.sx, sh.sy - 2);
      ctx.lineTo(sh.sx + (sh.sx < 0 ? -4 : 4), sh.sy - 7);
      ctx.lineTo(sh.sx + (sh.sx < 0 ? 2 : -2), sh.sy - 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Archer Quiver slung across back
  if (pClass === 'archer') {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-6, torsoY - 13);
    ctx.lineTo(-2, torsoY - 13);
    ctx.lineTo(-4, torsoY - 2);
    ctx.closePath();
    ctx.fill();
    // White arrow fletchings sticking out
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, torsoY - 13);
    ctx.lineTo(-7, torsoY - 17);
    ctx.moveTo(-3, torsoY - 13);
    ctx.lineTo(-4, torsoY - 18);
    ctx.stroke();
  }

  // 5. Head, Helm / Hood / Wizard Hat, & Directional Glowing Gaze
  const headY = -33 - bob;
  ctx.fillStyle = isGhost ? opts?.ghostColor || '#38bdf8' : palette.helm;
  ctx.beginPath();
  ctx.arc(0, headY, 6.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  if (pClass === 'swordsman') {
    // Knightly Greathelm Crest & Plume
    ctx.fillStyle = palette.armorTrim;
    ctx.fillRect(-1.2, headY - 7.5, 2.4, 6);
    // Flowing crimson helm plume
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, headY - 7.5);
    ctx.quadraticCurveTo(-6 * flipX, headY - 13, -9 * flipX, headY - 5);
    ctx.quadraticCurveTo(-4 * flipX, headY - 7, 0, headY - 5);
    ctx.fill();
  } else if (pClass === 'mage') {
    // Pointed Astral Archmage Hat & Gold Brim
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(0, headY - 3, 9.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6.5, headY - 3.5);
    ctx.lineTo(1.5, headY - 16);
    ctx.lineTo(6.5, headY - 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pClass === 'necromancer') {
    // Horned Bone Crown
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-5, headY - 4);
    ctx.quadraticCurveTo(-8, headY - 12, -4, headY - 14);
    ctx.moveTo(5, headY - 4);
    ctx.quadraticCurveTo(8, headY - 12, 4, headY - 14);
    ctx.stroke();
  } else if (pClass === 'archer') {
    // Pointed Ranger Cowl Peak
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.moveTo(-6, headY - 2);
    ctx.lineTo(-2 * flipX, headY - 10);
    ctx.lineTo(6, headY - 2);
    ctx.closePath();
    ctx.fill();
  }

  // Directional Visor / Glowing Eyes when not facing straight away
  if (!facingBack && !isGhost) {
    const eyeCenterX = dirX * 3.2;
    const eyeCenterY = headY + dirY * 1.4;
    if (pClass === 'swordsman') {
      // T-visor slit with golden inner gleam
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - 3.2, eyeCenterY);
      ctx.lineTo(eyeCenterX + 3.2, eyeCenterY);
      ctx.stroke();
    } else {
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(eyeCenterX - 1.8, eyeCenterY, 1.3, 0, Math.PI * 2);
      ctx.arc(eyeCenterX + 1.8, eyeCenterY, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // If facing away from camera (North), cloak renders over back of torso
  if (facingBack) {
    drawCloak();
  }

  // 6. Off-Hand Shield / Arcane Tome / Soul Lantern
  const offHandX = -dirY * 9 - dirX * 2;
  const offHandY = torsoY + 1 + dirX * 4;
  if (pClass === 'swordsman') {
    // Knightly Heater Shield with golden cross
    ctx.save();
    ctx.translate(offHandX, offHandY);
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(5, -6);
    ctx.lineTo(4.5, 2);
    ctx.lineTo(0, 7.5);
    ctx.lineTo(-4.5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(0, 5.5);
    ctx.moveTo(-3.2, -1);
    ctx.lineTo(3.2, -1);
    ctx.stroke();
    ctx.restore();
  } else if (pClass === 'mage' || pClass === 'necromancer') {
    // Floating Arcane Orb / Soul Lantern in off-hand
    const floatY = offHandY - 3 + Math.sin(gameTime * 5) * 2.5;
    ctx.save();
    ctx.fillStyle = palette.glow;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(offHandX, floatY, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(offHandX, floatY, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7. Main-Hand Weapon & Active Attack / Cast Animation
  const handAnchorX = dirY * 8 + dirX * 5;
  const handAnchorY = torsoY + 1 + dirY * 3;

  ctx.save();
  ctx.translate(handAnchorX, handAnchorY);
  ctx.rotate(isoAngle + swingAngle);

  if (pClass === 'swordsman') {
    // Broad Runed Greatsword
    // Pommel & Grip
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, -1.5, 5, 3);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-6, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Cruciform Gold Crossguard
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-0.5, -6.5, 2.8, 13);

    // Dual-toned Steel Blade with Blood/Rune Fuller
    const bladeGrad = ctx.createLinearGradient(2, -3, 28, 3);
    bladeGrad.addColorStop(0, '#f8fafc');
    bladeGrad.addColorStop(0.5, '#cbd5e1');
    bladeGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(2, -3.2);
    ctx.lineTo(24, -2.2);
    ctx.lineTo(30, 0);
    ctx.lineTo(24, 2.2);
    ctx.lineTo(2, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Glowing runic fuller line
    ctx.strokeStyle = player.isAttacking ? '#fef08a' : '#38bdf8';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();
  } else if (pClass === 'archer') {
    // Recurve Composite Bow & Nocked Glowing Arrow
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(2, 0, 13, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();

    // Gold bow tips
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(2, 0, 13, -Math.PI * 0.44, -Math.PI * 0.34);
    ctx.stroke();

    // Bowstring pulled back during attack
    const pull = player.isAttacking ? -5 : 0;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(4, -12.5);
    ctx.lineTo(pull, 0);
    ctx.lineTo(4, 12.5);
    ctx.stroke();

    // Nocked arrow with emerald/gold tip
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pull, 0);
    ctx.lineTo(19, 0);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(17, -2.5);
    ctx.lineTo(17, 2.5);
    ctx.closePath();
    ctx.fill();
  } else if (pClass === 'mage') {
    // Ornate Crystalline Archmage Staff
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();

    // Golden crescent staff head
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(23, 0, 4.5, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();

    // Glowing Levitating Staff Crystal
    ctx.fillStyle = player.isAttacking ? '#fb923c' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(25, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Necromancer Bone Scythe / Skull Staff
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();

    // Curved Soul-Reaper Scythe Blade
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, -1);
    ctx.quadraticCurveTo(26, 8, 13, 15);
    ctx.quadraticCurveTo(20, 6, 17, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Violet Skull at Scythe Crown
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(22, 0, 3, 0, Math.PI * 2);
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

export function drawNPCRig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  npc: NPCEntity,
  isNear: boolean,
  gameTime: number,
  isNight: boolean = false
): void {
  const speed = Math.hypot(npc.vx || 0, npc.vy || 0);
  const isMoving = speed > 4;
  const walkCycle = isMoving ? gameTime * 8.5 + npc.x * 0.05 : 0;
  const strideL = isMoving ? Math.sin(walkCycle) * 4.5 : 0;
  const strideR = isMoving ? -Math.sin(walkCycle) * 4.5 : 0;
  const bob = isMoving
    ? Math.abs(Math.sin(walkCycle)) * 2.1
    : Math.sin(gameTime * 2.5 + npc.x) * 1.3;

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

  // Role-specific Robes / Apron / Tunic
  const robeGrad = ctx.createLinearGradient(0, -34 - bob, 0, -2);
  robeGrad.addColorStop(0, npc.color);
  robeGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(-8, -28 - bob);
  ctx.lineTo(8, -28 - bob);
  ctx.lineTo(10, -2);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head & Role Headgear
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, -33 - bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (npc.role === 'elder' || npc.role === 'healer') {
    // Hooded mantle + staff
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(10, -38 - bob);
    ctx.stroke();
    ctx.fillStyle = npc.role === 'healer' ? '#34d399' : '#fde047';
    ctx.beginPath();
    ctx.arc(10, -40 - bob, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.role === 'blacksmith') {
    // Heavy leather smithing apron & forge hammer
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, -24 - bob, 12, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(9, -26 - bob, 6, 4);
  } else if (npc.role === 'shop' || npc.role === 'storage') {
    // Merchant velvet cap & gold sash
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -37 - bob, 6.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Handheld Warm Night Lantern when evening/dusk/night falls
  if (isNight && npc.carriesLantern !== false) {
    const lanternSwing = isMoving ? Math.sin(walkCycle) * 2.5 : Math.sin(gameTime * 3) * 0.8;
    const lx = -11 + lanternSwing;
    const ly = -16 - bob;
    // Iron handle
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7, -21 - bob);
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
