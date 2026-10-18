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
} from './types';
import { TileMap, DungeonThemeConfig, DungeonProp, DUNGEON_THEMES } from './world';
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

export class IsometricRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  public quality: RenderQuality = 'high';

  // Isometric constants: 64 wide x 32 high diamond
  private readonly isoTileW = 64;
  private readonly isoTileH = 32;

  private atlasBank = new TileAtlasBank();
  private lightmapCanvas: HTMLCanvasElement | null = null;
  private lightmapCtx: CanvasRenderingContext2D | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initLightmapCanvas();
  }

  private initLightmapCanvas() {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(this.width * 0.5));
      c.height = Math.max(1, Math.floor(this.height * 0.5));
      const lctx = c.getContext('2d');
      if (lctx) {
        this.lightmapCanvas = c;
        this.lightmapCtx = lctx;
      }
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.lightmapCanvas) {
      this.lightmapCanvas.width = Math.max(1, Math.floor(width * 0.5));
      this.lightmapCanvas.height = Math.max(1, Math.floor(height * 0.5));
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
    isTown: boolean = false
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Deep abyssal background canvas fill
    ctx.fillStyle = isTown ? '#070c14' : '#04060b';
    ctx.fillRect(0, 0, this.width, this.height);

    const atlas = this.atlasBank.getAtlas(theme);

    // Determine visible tile bounds
    const centerWorld = this.screenToWorld(this.width / 2, this.height / 2, camera);
    const centerTile = map.worldToTile(centerWorld.x, centerWorld.y);
    const renderRadius = 18;

    const startX = Math.max(0, centerTile.x - renderRadius);
    const endX = Math.min(map.width - 1, centerTile.x + renderRadius);
    const startY = Math.max(0, centerTile.y - renderRadius);
    const endY = Math.min(map.height - 1, centerTile.y + renderRadius);

    const dynamicLights: DynamicLightSource[] = [];

    // 1. Render Floor Tiles, Interior Bedrock Void, & Wall-to-Floor Ambient Occlusion
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const type = map.get(tx, ty);
        if (type === TileType.Empty) continue;

        const center = map.tileToWorldCenter(tx, ty);
        const pos = this.worldToScreen(center.x, center.y, 0, camera);

        if (pos.x < -100 || pos.x > this.width + 100 || pos.y < -100 || pos.y > this.height + 100) {
          continue;
        }

        if (type === TileType.Wall) {
          // Draw base footprint or deep bedrock for non-perimeter walls
          if (!this.isPerimeterWall(map, tx, ty)) {
            this.drawVoidBedrockTile(ctx, pos.x, pos.y, tx, ty, theme);
          }
          continue;
        }

        this.drawTile(ctx, pos.x, pos.y, type, tx, ty, gameTime, theme, isTown, atlas);

        // Cast directional wall ambient occlusion shadows onto walkable tiles bordering North/West walls
        const wallNorth = map.get(tx, ty - 1) === TileType.Wall;
        const wallWest = map.get(tx - 1, ty) === TileType.Wall;
        if (wallNorth || wallWest) {
          this.drawFloorWallShadow(ctx, pos.x, pos.y, wallNorth, wallWest);
        }

        if (type === TileType.Lava) {
          dynamicLights.push({
            x: pos.x,
            y: pos.y,
            radius: 95,
            color: '#f97316',
            intensity: 0.45,
          });
        } else if (type === TileType.Exit) {
          dynamicLights.push({
            x: pos.x,
            y: pos.y - 16,
            radius: 170,
            color: '#c084fc',
            intensity: 0.85,
          });
        } else if (type === TileType.Chest) {
          dynamicLights.push({
            x: pos.x,
            y: pos.y - 8,
            radius: 110,
            color: '#fbbf24',
            intensity: 0.55,
          });
        }
      }
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

    // 2. Collect all depth-sorted renderables: Perimeter 3D Walls, Props, Enemies, Player, Loot, Chests
    interface DepthItem {
      depth: number;
      draw: () => void;
    }
    const depthList: DepthItem[] = [];

    const playerTile = map.worldToTile(player.x, player.y);

    // Perimeter 3D Walls, Chests, and Exit Portals
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const type = map.get(tx, ty);
        if (type === TileType.Wall) {
          if (!this.isPerimeterWall(map, tx, ty)) continue;
          const center = map.tileToWorldCenter(tx, ty);
          const pos = this.worldToScreen(center.x, center.y, 0, camera);
          if (pos.x < -100 || pos.x > this.width + 100 || pos.y < -100 || pos.y > this.height + 100) {
            continue;
          }

          // Check if this southern wall directly occludes the player or a nearby enemy behind it
          const occludesPlayer =
            tx >= playerTile.x &&
            ty >= playerTile.y &&
            tx - playerTile.x <= 2 &&
            ty - playerTile.y <= 2 &&
            tx + ty > playerTile.x + playerTile.y;

          depthList.push({
            depth: center.x + center.y,
            draw: () =>
              this.drawWallBlock(
                ctx,
                pos.x,
                pos.y,
                tx,
                ty,
                theme,
                isTown,
                atlas,
                occludesPlayer ? 0.38 : 1.0
              ),
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
            draw: () => this.drawExitPortal(ctx, pos.x, pos.y, gameTime, isTown),
          });
        }
      }
    }

    // Handcrafted Environmental Props
    for (const prop of props) {
      const pos = this.worldToScreen(prop.x, prop.y, 0, camera);
      if (pos.x < -120 || pos.x > this.width + 120 || pos.y < -120 || pos.y > this.height + 120) {
        continue;
      }
      if (prop.lightColor && prop.lightRadius) {
        dynamicLights.push({
          x: pos.x,
          y: pos.y - 16,
          radius: prop.lightRadius,
          color: prop.lightColor,
          intensity: 0.78,
        });
      }
      depthList.push({
        depth: prop.x + prop.y,
        draw: () => this.drawProp(ctx, pos.x, pos.y, prop, gameTime, theme),
      });
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
      if (pos.x < -120 || pos.x > this.width + 120 || pos.y < -120 || pos.y > this.height + 120) {
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

    // Town NPCs
    for (const npc of npcs) {
      const pos = this.worldToScreen(npc.x, npc.y, 0, camera);
      const isNear = activeNPC !== null && activeNPC.id === npc.id;
      depthList.push({
        depth: npc.x + npc.y,
        draw: () => drawNPCRig(ctx, pos.x, pos.y, npc, isNear, gameTime),
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
        radius: 220,
        color: '#38bdf8',
        intensity: 0.85,
      });
      depthList.push({
        depth: fountainPos.x + fountainPos.y,
        draw: () => this.drawFountain(ctx, pos.x, pos.y, gameTime),
      });
    }

    // Hero (Player)
    const playerPos = this.worldToScreen(player.x, player.y, 0, camera);
    depthList.push({
      depth: player.x + player.y,
      draw: () => drawHeroRig(ctx, playerPos.x, playerPos.y, player, gameTime),
    });

    // Execute Painter's Algorithm Depth Sort
    depthList.sort((a, b) => a.depth - b.depth);
    for (const item of depthList) {
      item.draw();
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

    // 5. Offscreen Lightmap Compositing & Warm Torch / Spell Illumination
    if (this.quality !== 'low') {
      this.drawDynamicLighting(
        ctx,
        playerPos.x,
        playerPos.y,
        player.isAttacking,
        dynamicLights,
        theme,
        isTown,
        gameTime
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

  private drawVoidBedrockTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tx: number,
    ty: number,
    theme: DungeonThemeConfig
  ) {
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;
    const h = spatialHash(tx, ty, 77);

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
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.clip();

    if (wallNorth) {
      // North wall casts shadow along top-right edge of the isometric diamond
      const grad = ctx.createLinearGradient(x + hw * 0.5, y - hh * 0.5, x - hw * 0.2, y + hh * 0.2);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - hw, y - hh, this.isoTileW, this.isoTileH);
    }
    if (wallWest) {
      // West wall casts shadow along top-left edge of the isometric diamond
      const grad = ctx.createLinearGradient(x - hw * 0.5, y - hh * 0.5, x + hw * 0.2, y + hh * 0.2);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - hw, y - hh, this.isoTileW, this.isoTileH);
    }
    ctx.restore();
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
    atlas: ReturnType<TileAtlasBank['getAtlas']>
  ) {
    const hw = this.isoTileW / 2;
    const hh = this.isoTileH / 2;

    if (type === TileType.Floor || type === TileType.Chest || type === TileType.Exit) {
      const h = spatialHash(tx, ty, 19);
      if (atlas) {
        if (isTown) {
          const isRoad =
            tx === 15 ||
            tx === 16 ||
            ty === 15 ||
            ty === 16 ||
            (tx >= 12 && tx <= 19 && ty >= 12 && ty <= 19);
          const sprites = isRoad ? atlas.townRoadSprites : atlas.townGrassSprites;
          const sprite = sprites[h % sprites.length];
          ctx.drawImage(sprite, x - 36, y - 20);
          return;
        } else {
          // Bias variant distribution so runes (15) and bloodstains (11,12) are rare landmarks
          const roll = h % 32;
          const variantIdx =
            roll < 28 ? roll % 11 : roll === 28 ? 11 : roll === 29 ? 12 : roll === 30 ? 13 : 15;
          const sprite = atlas.floorSprites[variantIdx];
          ctx.drawImage(sprite, x - 36, y - 20);
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();

    if (type === TileType.Water) {
      const wave = Math.sin(gameTime * 3 + tx + ty) * 0.08;
      const waterGrad = ctx.createLinearGradient(x - hw, y - hh, x + hw, y + hh);
      waterGrad.addColorStop(0, `rgba(8, 51, 68, ${0.9 + wave})`);
      waterGrad.addColorStop(0.5, `rgba(14, 116, 144, ${0.85 + wave})`);
      waterGrad.addColorStop(1, `rgba(6, 182, 212, ${0.75 + wave})`);
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Recessed stone shoreline lip
      ctx.strokeStyle = '#164e63';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Animated shimmering water caustic ripples
      const rOffset = Math.sin(gameTime * 2.5 + tx * 1.3) * 4;
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 11 + rOffset, y - 2);
      ctx.quadraticCurveTo(x + rOffset, y - 5, x + 9 + rOffset, y - 2);
      ctx.moveTo(x - 7 - rOffset, y + 4);
      ctx.quadraticCurveTo(x - rOffset, y + 6, x + 8 - rOffset, y + 4);
      ctx.stroke();
    } else if (type === TileType.Lava) {
      const pulse = Math.sin(gameTime * 4 + tx * 1.7 + ty) * 0.15;
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
    alpha = 1.0
  ) {
    // Town perimeter trees on outer sanctuary ring
    if (isTown && (tx <= 1 || ty <= 1 || tx >= 30 || ty >= 30)) {
      this.drawTownSanctuaryTree(ctx, x, y, tx, ty);
      return;
    }

    if (atlas) {
      const h = spatialHash(tx, ty, 43);
      const sprites = isTown ? atlas.townWallSprites : atlas.wallSprites;
      const sprite = sprites[h % sprites.length];
      if (alpha < 0.99) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, x - 36, y - 74);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, x - 36, y - 74);
      }
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

  private drawTownSanctuaryTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tx: number,
    ty: number
  ) {
    ctx.save();
    // Soft ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gnarled timber trunk & roots
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 3);
    ctx.lineTo(x - 4, y - 26);
    ctx.lineTo(x + 4, y - 26);
    ctx.lineTo(x + 6, y + 3);
    ctx.closePath();
    ctx.fill();

    // Multi-layered dark-fantasy pine/oak foliage clusters
    const isAlt = (tx + ty) % 2 === 0;
    const layers = [
      { oy: -26, rx: 22, ry: 13, col: isAlt ? '#064e3b' : '#14532d' },
      { oy: -38, rx: 18, ry: 11, col: isAlt ? '#047857' : '#15803d' },
      { oy: -48, rx: 12, ry: 8, col: isAlt ? '#10b981' : '#22c55e' },
    ];
    for (const l of layers) {
      ctx.fillStyle = l.col;
      ctx.beginPath();
      ctx.ellipse(x, y + l.oy, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#022c22';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawProp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    prop: DungeonProp,
    gameTime: number,
    theme: DungeonThemeConfig
  ) {
    ctx.save();

    // Ground contact shadow for standing props
    if (prop.kind !== 'cobweb' && prop.kind !== 'torch' && prop.kind !== 'banner' && prop.kind !== 'chains') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (prop.kind === 'brazier') {
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
      ctx.shadowColor = prop.lightColor || '#f97316';
      ctx.shadowBlur = 10;
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
      ctx.shadowBlur = 0;
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
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 8;
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
      ctx.shadowBlur = 0;
    } else if (prop.kind === 'crystal') {
      // Multi-Spike Translucent Arcane/Glacial Crystal Cluster
      const pulse = 0.8 + Math.sin(gameTime * 4 + x) * 0.2;
      const cColor = prop.lightColor || '#38bdf8';
      ctx.shadowColor = cColor;
      ctx.shadowBlur = 12 * pulse;

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
      ctx.shadowBlur = 0;
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
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, orbY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (prop.kind === 'pillar') {
      // 3D Isometric Fluted Stone Column with Plinth & Capital
      // Base Plinth
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.fillRect(x - 12, y - 8, 24, 9);
      ctx.strokeRect(x - 12, y - 8, 24, 9);

      // Column Shaft with Cylindrical Shading
      const colGrad = ctx.createLinearGradient(x - 9, y - 48, x + 9, y - 8);
      colGrad.addColorStop(0, '#64748b');
      colGrad.addColorStop(0.5, '#334155');
      colGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = colGrad;
      ctx.fillRect(x - 9, y - 48, 18, 40);
      ctx.strokeRect(x - 9, y - 48, 18, 40);

      // Fluting grooves
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 46);
      ctx.lineTo(x - 3, y - 9);
      ctx.moveTo(x + 3, y - 46);
      ctx.lineTo(x + 3, y - 9);
      ctx.stroke();

      // Top Capital
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 12, y - 53, 24, 6);
      ctx.strokeRect(x - 12, y - 53, 24, 6);
    } else if (prop.kind === 'sarcophagus') {
      // Beveled 3D Stone Tomb with Effigy Relief & Iron Chains
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

      // Raised Beveled Lid
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x - 15, y - 5);
      ctx.lineTo(x, y - 13);
      ctx.lineTo(x + 15, y - 5);
      ctx.lineTo(x, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Carved Sword Cross on Sarcophagus Lid
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 5);
      ctx.lineTo(x + 8, y - 5);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y - 1);
      ctx.stroke();
    } else if (prop.kind === 'statue') {
      // Ancient Armored Guardian Statue on Pedestal
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.fillRect(x - 11, y - 10, 22, 11);
      ctx.strokeRect(x - 11, y - 10, 22, 11);

      // Stone Figure Torso, Shoulders, & Hooded Head
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

      // Glowing Rune Eyes on Statue
      ctx.fillStyle = theme.torchColor;
      ctx.beginPath();
      ctx.arc(x - 2, y - 35, 1.1, 0, Math.PI * 2);
      ctx.arc(x + 2, y - 35, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Stone Greatsword planted downward in front of pedestal
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.lineTo(x, y - 6);
      ctx.moveTo(x - 5, y - 22);
      ctx.lineTo(x + 5, y - 22);
      ctx.stroke();
    } else if (prop.kind === 'arch') {
      // Ruined Gothic Stone Archway Pillars & Keystone Arch
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 24, y - 46, 8, 46);
      ctx.strokeRect(x - 24, y - 46, 8, 46);
      ctx.fillRect(x + 16, y - 46, 8, 46);
      ctx.strokeRect(x + 16, y - 46, 8, 46);

      // Gothic Arch Span
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y - 42, 20, Math.PI, 0);
      ctx.stroke();
    } else if (prop.kind === 'barrel') {
      // Bound Oak Dungeon Cask with Iron Hoops
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

      // Iron Hoops
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y - 13, 8, 3, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 8, 3, 0, 0, Math.PI);
      ctx.stroke();

      // Barrel Top Lid
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(x, y - 17, 6.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (prop.kind === 'crate') {
      // Isometric Reinforced Timber Supply Crate
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      ctx.fillRect(x - 9, y - 16, 18, 16);
      ctx.strokeRect(x - 9, y - 16, 18, 16);

      // Diagonal timber cross-brace
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 15);
      ctx.lineTo(x + 8, y - 1);
      ctx.moveTo(x + 8, y - 15);
      ctx.lineTo(x - 8, y - 1);
      ctx.stroke();
    } else if (prop.kind === 'bones') {
      // Bleached Skeletal Remains & Skull on Floor
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 2);
      ctx.lineTo(x + 7, y + 3);
      ctx.moveTo(x - 6, y + 4);
      ctx.lineTo(x + 8, y - 3);
      ctx.stroke();

      // Skull
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
      // Hanging Iron Dungeon Chains & Manacles
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
      // Translucent Radial Corner Cobweb
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
      // Tattered Crimson-and-Gold Heraldic War Banner
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
      // Clustered Chiseled Masonry Rubble
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

  private drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, gameTime: number) {
    ctx.save();

    // Outer Carved Stone Basin
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shimmering Healing Water Pool
    const waterGrad = ctx.createRadialGradient(x, y, 4, x, y, 36);
    waterGrad.addColorStop(0, '#bae6fd');
    waterGrad.addColorStop(0.5, '#0284c7');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expanding concentric water ripples
    const r1 = ((gameTime * 16) % 28) + 6;
    ctx.strokeStyle = `rgba(224, 242, 254, ${1 - r1 / 34})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, r1, r1 * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Central Spire & Levitating Crystal Heart
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 6, y - 28, 12, 26);

    const crystalBob = Math.sin(gameTime * 3.5) * 3;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y - 44 + crystalBob);
    ctx.lineTo(x + 7, y - 34 + crystalBob);
    ctx.lineTo(x, y - 24 + crystalBob);
    ctx.lineTo(x - 7, y - 34 + crystalBob);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 10px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('SANCTUARY FOUNTAIN', x, y - 52);

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
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 + bob);
    ctx.lineTo(x + 6, y - 8 + bob);
    ctx.lineTo(x, y - 2 + bob);
    ctx.lineTo(x - 6, y - 8 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

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

      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(1, 0, proj.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Arcane / Shadow / Frost Orb with Orbiting Runic Ring
      ctx.translate(x, y);
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 14;
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
      ctx.shadowBlur = 0;
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
      ctx.shadowColor = p.secondaryColor || p.color;
      ctx.shadowBlur = 10;
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
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 6;
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
    theme: DungeonThemeConfig,
    isTown: boolean,
    gameTime: number
  ) {
    const flicker = 1 + Math.sin(gameTime * 9) * 0.025 + Math.cos(gameTime * 15) * 0.015;
    const heroRadius = (isTown ? 310 : 255) * flicker;

    // 1. Offscreen Multiplicative Darkness & Light Cutout Composite
    if (this.lightmapCanvas && this.lightmapCtx) {
      const lctx = this.lightmapCtx;
      const lw = this.lightmapCanvas.width;
      const lh = this.lightmapCanvas.height;
      const scaleX = lw / this.width;
      const scaleY = lh / this.height;

      lctx.save();
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, lw, lh);

      // Ambient darkness base (keeps player surroundings readable while giving torches real contrast)
      lctx.fillStyle = isTown ? 'rgba(6, 10, 18, 0.34)' : 'rgba(4, 6, 12, 0.74)';
      lctx.fillRect(0, 0, lw, lh);

      // Cut out soft radial light fields using destination-out
      lctx.globalCompositeOperation = 'destination-out';

      const punchLight = (sx: number, sy: number, radius: number, strength: number) => {
        const lx = sx * scaleX;
        const ly = sy * scaleY;
        const lr = Math.max(4, radius * scaleX);
        const grad = lctx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
        grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1, strength)})`);
        grad.addColorStop(0.55, `rgba(0, 0, 0, ${Math.min(1, strength * 0.65)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lctx.fillStyle = grad;
        lctx.beginPath();
        lctx.arc(lx, ly, lr, 0, Math.PI * 2);
        lctx.fill();
      };

      // Hero lantern light cutout
      punchLight(playerX, playerY - 16, heroRadius, 0.96);

      // Environmental & Spell light cutouts
      for (const l of lights) {
        if (l.x < -250 || l.x > this.width + 250 || l.y < -250 || l.y > this.height + 250) {
          continue;
        }
        punchLight(l.x, l.y, l.radius, l.intensity);
      }

      lctx.restore();

      // Composite the offscreen lightmap over the main gameplay viewport
      ctx.save();
      ctx.drawImage(this.lightmapCanvas, 0, 0, this.width, this.height);
      ctx.restore();
    }

    // 2. Additive Warm Torch, Crystal, & Spell Light Bloom Pass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Hero warm lantern bloom
    const heroBloom = ctx.createRadialGradient(
      playerX,
      playerY - 16,
      8,
      playerX,
      playerY - 16,
      isPlayerAttacking ? 185 : 145
    );
    heroBloom.addColorStop(
      0,
      isPlayerAttacking ? 'rgba(251, 191, 36, 0.16)' : 'rgba(245, 158, 11, 0.09)'
    );
    heroBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heroBloom;
    ctx.beginPath();
    ctx.arc(playerX, playerY - 16, isPlayerAttacking ? 185 : 145, 0, Math.PI * 2);
    ctx.fill();

    // Local Torch, Brazier, Crystal, & Spell Colored Illumination (steady, restrained glow)
    for (const l of lights) {
      if (l.x < -200 || l.x > this.width + 200 || l.y < -200 || l.y > this.height + 200) {
        continue;
      }
      const r = l.radius * 0.65;
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, r);
      g.addColorStop(0, l.color);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = 0.09 * l.intensity;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawAtmosphericMotes(
    _ctx: CanvasRenderingContext2D,
    _camera: Camera,
    _theme: DungeonThemeConfig,
    _isTown: boolean,
    _gameTime: number
  ) {
    // Disabled screen-space floating light spots for a clean, distraction-free viewport
  }
}
