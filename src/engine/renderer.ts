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
} from './types';
import { TileMap } from './world';
import { getItemDef } from './items';

export interface Camera {
  x: number; // Screen space focus target
  y: number;
}

export class IsometricRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  // Isometric constants: 64 wide x 32 high diamond
  private readonly isoTileW = 64;
  private readonly isoTileH = 32;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // World coordinates (grid space * tile size) to Isometric Screen coordinates
  worldToScreen(wx: number, wy: number, wz = 0, camera: Camera): { x: number; y: number } {
    // Standard 2:1 isometric transformation
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

  render(
    map: TileMap,
    camera: Camera,
    player: {
      x: number;
      y: number;
      facingAngle: number;
      isAttacking: boolean;
      attackAnimTimer: number;
      health: number;
      maxHealth: number;
      playerName?: string;
      playerClass?: string;
    },
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
    fountainPos: { x: number; y: number } | null = null
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Dark moody ambient dungeon background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Determine visible tile bounds
    const centerWorld = this.screenToWorld(this.width / 2, this.height / 2, camera);
    const centerTile = map.worldToTile(centerWorld.x, centerWorld.y);
    const renderRadius = 18;

    const startX = Math.max(0, centerTile.x - renderRadius);
    const endX = Math.min(map.width - 1, centerTile.x + renderRadius);
    const startY = Math.max(0, centerTile.y - renderRadius);
    const endY = Math.min(map.height - 1, centerTile.y + renderRadius);

    // 1. Render floor tiles first
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const type = map.get(tx, ty);
        if (type === TileType.Empty) continue;

        const center = map.tileToWorldCenter(tx, ty);
        const pos = this.worldToScreen(center.x, center.y, 0, camera);

        // Cull off-screen tiles
        if (pos.x < -100 || pos.x > this.width + 100 || pos.y < -100 || pos.y > this.height + 100) {
          continue;
        }

        this.drawTile(ctx, pos.x, pos.y, type, tx, ty, gameTime);
      }
    }

    // 1.5 Render Ground Warning Telegraphs (Boss AoE circles)
    for (const tele of telegraphs) {
      const pos = this.worldToScreen(tele.x, tele.y, 0, camera);
      const ratio = Math.max(0, Math.min(1, 1 - tele.duration / tele.maxDuration));
      const rx = tele.radius * (this.isoTileW / 64);
      const ry = tele.radius * (this.isoTileH / 64);

      ctx.save();
      // Outer warning perimeter
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Expanding detonation progress circle
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx * ratio, ry * ratio, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.fill();

      // Warning text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ DANGER', pos.x, pos.y + 4);
      ctx.restore();
    }

    // 2. Collect all depth-sorted renderables: Wall blocks, Enemies, Player, Loot drops, Chests
    interface DepthItem {
      depth: number;
      draw: () => void;
    }
    const depthList: DepthItem[] = [];

    // Walls with 2.5D height
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const type = map.get(tx, ty);
        if (type === TileType.Wall) {
          const center = map.tileToWorldCenter(tx, ty);
          const pos = this.worldToScreen(center.x, center.y, 0, camera);
          if (pos.x < -100 || pos.x > this.width + 100 || pos.y < -100 || pos.y > this.height + 100) {
            continue;
          }
          depthList.push({
            depth: center.x + center.y,
            draw: () => this.drawWallBlock(ctx, pos.x, pos.y, tx, ty),
          });
        } else if (type === TileType.Chest) {
          const center = map.tileToWorldCenter(tx, ty);
          const pos = this.worldToScreen(center.x, center.y, 0, camera);
          depthList.push({
            depth: center.x + center.y,
            draw: () => this.drawChest(ctx, pos.x, pos.y, gameTime),
          });
        } else if (type === TileType.Exit) {
          const center = map.tileToWorldCenter(tx, ty);
          const pos = this.worldToScreen(center.x, center.y, 0, camera);
          depthList.push({
            depth: center.x + center.y,
            draw: () => this.drawExitPortal(ctx, pos.x, pos.y, gameTime),
          });
        }
      }
    }

    // Loot drops
    for (const drop of lootDrops) {
      const pos = this.worldToScreen(drop.x, drop.y, 0, camera);
      depthList.push({
        depth: drop.x + drop.y,
        draw: () => this.drawLootDrop(ctx, pos.x, pos.y, drop, gameTime),
      });
    }

    // Enemies
    for (const enemy of enemies) {
      const pos = this.worldToScreen(enemy.x, enemy.y, enemy.z, camera);
      depthList.push({
        depth: enemy.x + enemy.y,
        draw: () => this.drawEnemy(ctx, pos.x, pos.y, enemy, gameTime),
      });
    }

    // NPCs
    for (const npc of npcs) {
      const pos = this.worldToScreen(npc.x, npc.y, 0, camera);
      const isNear = activeNPC !== null && activeNPC.id === npc.id;
      depthList.push({
        depth: npc.x + npc.y,
        draw: () => this.drawNPC(ctx, pos.x, pos.y, npc, isNear, gameTime),
      });
    }

    // Summons
    for (const summon of summons) {
      const pos = this.worldToScreen(summon.x, summon.y, 0, camera);
      depthList.push({
        depth: summon.x + summon.y,
        draw: () => this.drawSummon(ctx, pos.x, pos.y, summon, gameTime),
      });
    }

    // Town Central Fountain
    if (fountainPos) {
      const pos = this.worldToScreen(fountainPos.x, fountainPos.y, 0, camera);
      depthList.push({
        depth: fountainPos.x + fountainPos.y,
        draw: () => this.drawFountain(ctx, pos.x, pos.y, gameTime),
      });
    }

    // Player
    const playerPos = this.worldToScreen(player.x, player.y, 0, camera);
    depthList.push({
      depth: player.x + player.y,
      draw: () => this.drawPlayer(ctx, playerPos.x, playerPos.y, player, gameTime),
    });

    // Sort ascending by depth (isometric Y-sorting)
    depthList.sort((a, b) => a.depth - b.depth);
    for (const item of depthList) {
      item.draw();
    }

    // 3. Projectiles (rendered above ground)
    for (const proj of projectiles) {
      const pos = this.worldToScreen(proj.x, proj.y, 16, camera);
      this.drawProjectile(ctx, pos.x, pos.y, proj);
    }

    // 4. Particles
    for (const p of particles) {
      const pos = this.worldToScreen(p.x, p.y, 8, camera);
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Dynamic Lighting Vignette & Player Lantern Glow
    this.drawTorchLighting(ctx, playerPos.x, playerPos.y);

    // 6. Floating Combat Numbers
    for (const fct of floatingTexts) {
      const pos = this.worldToScreen(fct.x, fct.y, 24, camera);
      const progress = 1 - fct.lifetime / fct.maxLifetime;
      const offsetY = progress * 32;
      const alpha = Math.max(0, fct.lifetime / fct.maxLifetime);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = fct.isCrit ? 'bold 18px "Cinzel", serif' : 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = fct.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(fct.text, pos.x, pos.y - offsetY);
      ctx.restore();
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: TileType,
    tx: number,
    ty: number,
    gameTime: number
  ) {
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();

    if (type === TileType.Floor) {
      const isAlt = (tx + ty) % 2 === 0;
      ctx.fillStyle = isAlt ? '#1a202c' : '#171d28';
      ctx.fill();

      // Stone tile border line
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Subtle dungeon floor cracks on some tiles
      if ((tx * 7 + ty * 13) % 5 === 0) {
        ctx.strokeStyle = '#111622';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x + 2, y + 4);
        ctx.lineTo(x + 8, y + 1);
        ctx.stroke();
      }
    } else if (type === TileType.Water) {
      const wave = Math.sin(gameTime * 3 + tx + ty) * 0.1;
      ctx.fillStyle = `rgba(14, 116, 144, ${0.7 + wave})`;
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else if (type === TileType.Lava) {
      const pulse = Math.sin(gameTime * 4 + tx * 2) * 0.15;
      ctx.fillStyle = `rgba(225, 29, 72, ${0.85 + pulse})`;
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (type === TileType.Pit) {
      // Bottomless Chasm Abyss
      ctx.fillStyle = '#030712';
      ctx.fill();
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Deep void inner rim
      ctx.beginPath();
      ctx.moveTo(x, y - hh * 0.65);
      ctx.lineTo(x + hw * 0.65, y);
      ctx.lineTo(x, y + hh * 0.65);
      ctx.lineTo(x - hw * 0.65, y);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    ctx.restore();
  }

  private drawWallBlock(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number) {
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;
    const wallHeight = 44;

    ctx.save();

    // Left face
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - wallHeight);
    ctx.lineTo(x - hw, y - wallHeight);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    // Right face
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y - wallHeight);
    ctx.lineTo(x, y + hh - wallHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top face
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(x, y - hh - wallHeight);
    ctx.lineTo(x + hw, y - wallHeight);
    ctx.lineTo(x, y + hh - wallHeight);
    ctx.lineTo(x - hw, y - wallHeight);
    ctx.closePath();
    ctx.fill();

    // Wall top stone rim
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, gameTime: number) {
    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest body
    const bob = Math.sin(gameTime * 3) * 1.5;
    const cy = y - 10 + bob;

    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 14, cy - 8, 28, 16);

    // Gold trim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 14, cy - 8, 28, 16);

    // Gold lock & glow
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawExitPortal(ctx: CanvasRenderingContext2D, x: number, y: number, gameTime: number) {
    ctx.save();
    const rot = gameTime * 2.5;

    // Portal aura
    const grad = ctx.createRadialGradient(x, y, 4, x, y, 32);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(0.5, '#6366f1');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Swirling rings
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 20, 10, rot, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 14, 7, -rot, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    player: {
      facingAngle: number;
      isAttacking: boolean;
      attackAnimTimer: number;
      health: number;
      maxHealth: number;
    },
    gameTime: number
  ) {
    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const charY = y - 16;

    // Knight Body
    ctx.fillStyle = '#3b82f6'; // Blue tabard
    ctx.beginPath();
    ctx.arc(x, charY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Silver armor plate
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(x, charY - 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Helmet crest & visor
    ctx.fillStyle = '#0f172a';
    const lookX = Math.cos(player.facingAngle) * 5;
    const lookY = Math.sin(player.facingAngle) * 3;
    ctx.fillRect(x + lookX - 3, charY - 4 + lookY, 6, 3);

    // Glowing cyan eyes
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + lookX - 2, charY - 3 + lookY, 4, 1.5);

    // Sword and attack swing
    if (player.isAttacking && player.attackAnimTimer > 0) {
      const swingProgress = player.attackAnimTimer / 0.25;
      const angle = player.facingAngle - 1.2 + (1 - swingProgress) * 2.4;
      const bladeX = x + Math.cos(angle) * 26;
      const bladeY = charY + Math.sin(angle) * 18;

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 8, charY + Math.sin(angle) * 6);
      ctx.lineTo(bladeX, bladeY);
      ctx.stroke();

      // Golden swing arc trail
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, charY, 26, angle - 0.4, angle + 0.4);
      ctx.stroke();
    } else {
      // Idle weapon at hip
      const swordX = x + Math.cos(player.facingAngle + 0.8) * 14;
      const swordY = charY + Math.sin(player.facingAngle + 0.8) * 10;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, charY + 2);
      ctx.lineTo(swordX, swordY);
      ctx.stroke();
    }

    // Health bar above player
    const hbWidth = 32;
    const hbHeight = 4;
    const hbY = charY - 22;
    const pct = Math.max(0, Math.min(1, player.health / player.maxHealth));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(x - hbWidth / 2, hbY, hbWidth, hbHeight);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - hbWidth / 2, hbY, hbWidth * pct, hbHeight);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - hbWidth / 2, hbY, hbWidth, hbHeight);

    ctx.restore();
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    enemy: EnemyEntity,
    gameTime: number
  ) {
    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, enemy.size * 0.7, enemy.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const charY = y - enemy.size;

    // Hit flash
    if (enemy.isHitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = enemy.color;
    }

    // Archetype specific drawing
    if (enemy.archetype === 'skeleton_warrior') {
      // Bone structure
      ctx.beginPath();
      ctx.arc(x, charY, enemy.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Glowing red eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x - 3, charY - 2, 2, 0, Math.PI * 2);
      ctx.arc(x + 3, charY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.archetype === 'goblin_archer') {
      // Green goblin hood
      ctx.beginPath();
      ctx.arc(x, charY, enemy.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Wooden bow
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 10, charY, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else if (enemy.archetype === 'necromancer') {
      // Dark robed wizard with horn/cowl
      ctx.beginPath();
      ctx.arc(x, charY, enemy.size * 0.65, 0, Math.PI * 2);
      ctx.fill();
      // Staff with skull orb
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, charY + 12);
      ctx.lineTo(x - 12, charY - 16);
      ctx.stroke();
      ctx.fillStyle = '#d946ef';
      ctx.beginPath();
      ctx.arc(x - 12, charY - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.archetype === 'dungeon_lord') {
      // Boss: massive horned demonic brute
      if (enemy.isEnraged) {
        // Enraged fiery aura pulsing around the boss
        const auraRadius = enemy.size * 1.1 + Math.sin(gameTime * 8) * 4;
        ctx.beginPath();
        ctx.arc(x, charY, auraRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, charY, enemy.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Horns
      ctx.strokeStyle = enemy.isEnraged ? '#ef4444' : '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, charY - 10);
      ctx.lineTo(x - 18, charY - 24);
      ctx.moveTo(x + 10, charY - 10);
      ctx.lineTo(x + 18, charY - 24);
      ctx.stroke();

      // Glowing Eyes
      ctx.fillStyle = enemy.isEnraged ? '#fbbf24' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x - 4, charY - 4, 3, 0, Math.PI * 2);
      ctx.arc(x + 4, charY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    const hbWidth = Math.max(28, enemy.size * 2);
    const hbHeight = 4;
    const hbY = charY - enemy.size - 8;
    const pct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(x - hbWidth / 2, hbY, hbWidth, hbHeight);
    ctx.fillStyle = enemy.archetype === 'dungeon_lord' ? (enemy.isEnraged ? '#dc2626' : '#f59e0b') : '#ef4444';
    ctx.fillRect(x - hbWidth / 2, hbY, hbWidth * pct, hbHeight);

    // Enemy Name and Badges for Boss
    if (enemy.archetype === 'dungeon_lord') {
      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      const label = enemy.isEnraged ? `🔥 ${enemy.name} (ENRAGED) 🔥` : enemy.name;
      ctx.fillText(label, x, hbY - 4);
    }

    // Status effect badges above health bar
    if (enemy.statusEffects.length > 0) {
      let iconX = x - ((enemy.statusEffects.length - 1) * 12) / 2;
      for (const eff of enemy.statusEffects) {
        ctx.fillStyle = eff.color;
        ctx.beginPath();
        ctx.arc(iconX, hbY - 12, 4, 0, Math.PI * 2);
        ctx.fill();
        iconX += 12;
      }
    }

    ctx.restore();
  }

  private drawLootDrop(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    drop: LootDropEntity,
    gameTime: number
  ) {
    const itemDef = getItemDef(drop.item.itemDefId);
    if (!itemDef) return;

    ctx.save();
    const bob = Math.sin(gameTime * 4 + drop.x) * 3;
    const itemY = y - 10 + bob;

    const rarity = itemDef.rarity ?? ItemRarity.Common;

    // Rarity aura & pillar beam
    let beamColor = '#94a3b8';
    if (rarity === ItemRarity.Uncommon) beamColor = '#10b981';
    if (rarity === ItemRarity.Rare) beamColor = '#0ea5e9';
    if (rarity === ItemRarity.Epic) beamColor = '#a855f7';
    if (rarity === ItemRarity.Legendary) beamColor = '#f59e0b';

    // Vertical light beam for Rare, Epic, Legendary
    if (rarity >= ItemRarity.Rare) {
      const grad = ctx.createLinearGradient(x, itemY, x, itemY - 60);
      grad.addColorStop(0, beamColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 2, itemY - 60, 4, 60);
    }

    // Sparkle gem icon
    ctx.fillStyle = beamColor;
    ctx.beginPath();
    ctx.arc(x, itemY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Rarity ring pulse
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, itemY, 8 + Math.sin(gameTime * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, x: number, y: number, proj: Projectile) {
    ctx.save();
    ctx.fillStyle = proj.color;
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawNPC(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    npc: NPCEntity,
    isNear: boolean,
    gameTime: number
  ) {
    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Interaction Ring if player is near
    if (isNear) {
      const ringPulse = Math.sin(gameTime * 6) * 3;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 22 + ringPulse, 11 + ringPulse / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floating "[E] Talk" prompt
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.textAlign = 'center';
      const promptY = y - 48 + Math.sin(gameTime * 4) * 2;
      ctx.fillText('[E] Talk', x, promptY);
    }

    // NPC Robe / Body
    const bob = Math.sin(gameTime * 2 + x) * 1;
    const bodyY = y - 10 + bob;

    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(x, bodyY - 8, 8, 0, Math.PI * 2); // Head
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, bodyY);
    ctx.lineTo(x - 9, bodyY + 14);
    ctx.lineTo(x + 9, bodyY + 14);
    ctx.closePath();
    ctx.fill();

    // Gold collar / trim
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Floating Name & Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "Cinzel", serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(npc.name, x, y - 32);

    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(npc.title, x, y - 22);

    ctx.restore();
  }

  private drawSummon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    summon: SummonEntity,
    gameTime: number
  ) {
    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Minion Body (Pale bone with ethereal glow)
    const bob = Math.sin(gameTime * 4 + x) * 2;
    const my = y - 8 + bob;

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(x, my - 6, 6, 0, Math.PI * 2); // Skull
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 5, my, 10, 10); // Ribcage

    // Ethereal green eye wisps
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x - 2, my - 6, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 2, my - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Mini Health Bar
    const hpPct = Math.max(0, summon.health / summon.maxHealth);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 12, y - 24, 24, 3);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 12, y - 24, 24 * hpPct, 3);

    ctx.restore();
  }

  private drawFountain(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gameTime: number
  ) {
    ctx.save();

    // Stone Basin Outer Rim
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(x, y, 42, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Water Surface
    const wave = Math.sin(gameTime * 3) * 0.1;
    ctx.fillStyle = `rgba(14, 165, 233, ${0.75 + wave})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center Pedestal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 6, y - 18, 12, 18);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(x - 6, y - 18, 12, 18);

    // Glowing Fountain Crystal
    const bob = Math.sin(gameTime * 4) * 2;
    const crystalY = y - 28 + bob;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x, crystalY - 10);
    ctx.lineTo(x + 7, crystalY);
    ctx.lineTo(x, crystalY + 10);
    ctx.lineTo(x - 7, crystalY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawTorchLighting(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.save();
    // Radial darkness mask
    const radius = 340;
    const grad = ctx.createRadialGradient(px, py, 60, px, py, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.6, 'rgba(6, 8, 14, 0.45)');
    grad.addColorStop(1, 'rgba(6, 8, 14, 0.95)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
