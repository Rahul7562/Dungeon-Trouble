import {
  TileType,
  AttributeType,
  StatType,
  EquipmentState,
  ItemStack,
  EnemyEntity,
  Projectile,
  LootDropEntity,
  Particle,
  FloatingCombatText,
  CombatLogEntry,
  DamageSchool,
  EquipSlot,
  PlayerStats,
} from './types';
import { TileMap, generateDungeonLevel, TileFlags } from './world';
import { computeTotalStats, getStatName } from './stats';
import { resolveDamagePipeline, DAMAGE_FLAGS, getSchoolColor } from './combat';
import { rollLoot } from './loot';
import { getItemDef, createItemStack } from './items';
import { PLAYER_ABILITIES } from './abilities';
import { sound } from './audio';

export interface GameEngineState {
  currentFloor: number;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facingAngle: number;
    isAttacking: boolean;
    attackAnimTimer: number;
  };
  playerStats: PlayerStats;
  equipment: EquipmentState;
  inventory: (ItemStack | null)[];
  enemies: EnemyEntity[];
  projectiles: Projectile[];
  lootDrops: LootDropEntity[];
  particles: Particle[];
  floatingTexts: FloatingCombatText[];
  combatLogs: CombatLogEntry[];
  abilityCooldowns: Record<number, number>; // abilityId -> seconds left
  dungeon: ReturnType<typeof generateDungeonLevel>;
  isGameOver: boolean;
  isVictory: boolean;
  unallocatedStatPoints: number;
  floorCleared: boolean;
}

export class GameEngine {
  public state: GameEngineState;
  private keyState: Record<string, boolean> = {};
  public mousePos = { x: 0, y: 0 };
  public camera = { x: 0, y: 0 };
  private nextEntityId = 1;

  constructor() {
    this.state = this.initializeNewGame();
  }

  public initializeNewGame(startFloor = 1): GameEngineState {
    const dungeon = generateDungeonLevel(startFloor);

    const initialAttributes: Record<AttributeType, number> = {
      [AttributeType.STR]: 12,
      [AttributeType.DEX]: 10,
      [AttributeType.INT]: 8,
      [AttributeType.VIT]: 12,
    };

    const initialEquipment: EquipmentState = {
      [EquipSlot.None]: null,
      [EquipSlot.Head]: null,
      [EquipSlot.Chest]: createItemStack(2, 1), // Reinforced Iron Armor
      [EquipSlot.Legs]: null,
      [EquipSlot.Boots]: null,
      [EquipSlot.MainHand]: createItemStack(1, 1), // Rusty Shortsword
      [EquipSlot.OffHand]: null,
      [EquipSlot.Ring]: null,
      [EquipSlot.Amulet]: null,
    };

    const initialInventory: (ItemStack | null)[] = new Array(20).fill(null);
    initialInventory[0] = createItemStack(10, 3); // 3 Health Potions
    initialInventory[1] = createItemStack(11, 2); // 2 Mana Flasks

    const calculatedStats = computeTotalStats(initialAttributes, initialEquipment);

    const playerStats: PlayerStats = {
      attributes: initialAttributes,
      calculated: calculatedStats,
      health: calculatedStats[StatType.MaxHealth],
      mana: calculatedStats[StatType.MaxMana],
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      gold: 50,
    };

    const state: GameEngineState = {
      currentFloor: startFloor,
      player: {
        x: dungeon.playerSpawn.x,
        y: dungeon.playerSpawn.y,
        vx: 0,
        vy: 0,
        facingAngle: 0,
        isAttacking: false,
        attackAnimTimer: 0,
      },
      playerStats,
      equipment: initialEquipment,
      inventory: initialInventory,
      enemies: [],
      projectiles: [],
      lootDrops: [],
      particles: [],
      floatingTexts: [],
      combatLogs: [
        {
          id: 'init-1',
          text: `Entered Dungeon Chamber - Floor ${startFloor}. Slay foes and seek the portal.`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      abilityCooldowns: {},
      dungeon,
      isGameOver: false,
      isVictory: false,
      unallocatedStatPoints: 0,
      floorCleared: false,
    };

    this.spawnFloorEnemies(state, dungeon, startFloor);
    return state;
  }

  private spawnFloorEnemies(state: GameEngineState, dungeon: ReturnType<typeof generateDungeonLevel>, floor: number) {
    const enemies: EnemyEntity[] = [];

    // Spawn regular enemies in intermediate rooms
    for (let r = 1; r < dungeon.rooms.length - 1; r++) {
      const room = dungeon.rooms[r];
      const count = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < count; i++) {
        const tx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const ty = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        const spawn = dungeon.map.tileToWorldCenter(tx, ty);

        const isArcher = Math.random() > 0.6;
        const isNecromancer = floor >= 2 && Math.random() > 0.75;

        if (isNecromancer) {
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'necromancer',
            name: 'Crypt Necromancer',
            x: spawn.x,
            y: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: 90 + floor * 20,
            maxHealth: 90 + floor * 20,
            attackPower: 16 + floor * 4,
            armor: 8,
            moveSpeed: 60,
            attackRange: 240,
            attackCooldown: 2.2,
            attackTimer: Math.random() * 1.5,
            xpReward: 35,
            color: '#7e22ce',
            size: 16,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
          });
        } else if (isArcher) {
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'goblin_archer',
            name: 'Sentry Archer',
            x: spawn.x,
            y: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: 60 + floor * 15,
            maxHealth: 60 + floor * 15,
            attackPower: 12 + floor * 3,
            armor: 5,
            moveSpeed: 85,
            attackRange: 200,
            attackCooldown: 1.6,
            attackTimer: Math.random() * 1.2,
            xpReward: 25,
            color: '#15803d',
            size: 14,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
          });
        } else {
          enemies.push({
            id: `enemy-${this.nextEntityId++}`,
            archetype: 'skeleton_warrior',
            name: 'Skeleton Marauder',
            x: spawn.x,
            y: spawn.y,
            z: 0,
            vx: 0,
            vy: 0,
            health: 80 + floor * 18,
            maxHealth: 80 + floor * 18,
            attackPower: 14 + floor * 3,
            armor: 12,
            moveSpeed: 95,
            attackRange: 45,
            attackCooldown: 1.2,
            attackTimer: Math.random() * 1.0,
            xpReward: 20,
            color: '#e2e8f0',
            size: 15,
            facingAngle: 0,
            statusEffects: [],
            isHitFlashTimer: 0,
          });
        }
      }
    }

    // Spawn Boss in the final room
    const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];
    const bossSpawn = dungeon.map.tileToWorldCenter(lastRoom.centerX, lastRoom.centerY - 2);

    enemies.push({
      id: `boss-${this.nextEntityId++}`,
      archetype: 'dungeon_lord',
      name: floor === 3 ? 'Malakor, Lord of Ruin' : `Floor ${floor} Overseer`,
      x: bossSpawn.x,
      y: bossSpawn.y,
      z: 0,
      vx: 0,
      vy: 0,
      health: 300 + floor * 150,
      maxHealth: 300 + floor * 150,
      attackPower: 26 + floor * 8,
      armor: 24 + floor * 4,
      moveSpeed: 75,
      attackRange: 70,
      attackCooldown: 1.8,
      attackTimer: 0.5,
      xpReward: 120 + floor * 50,
      color: '#dc2626',
      size: 26,
      facingAngle: 0,
      statusEffects: [],
      isHitFlashTimer: 0,
    });

    state.enemies = enemies;
  }

  public handleKeyDown(key: string) {
    const k = key.toLowerCase();
    this.keyState[k] = true;

    if (k === '1') {
      this.triggerAbility(1);
    } else if (k === '2' || k === 'q') {
      this.triggerAbility(2);
    } else if (k === '3' || k === 'e') {
      this.triggerAbility(3);
    } else if (k === '4' || k === ' ') {
      this.triggerAbility(4);
    }
  }

  public handleKeyUp(key: string) {
    this.keyState[key.toLowerCase()] = false;
  }

  public triggerAbility(abilityId: number) {
    const state = this.state;
    if (state.isGameOver || state.isVictory) return;

    const ability = PLAYER_ABILITIES.find((a) => a.id === abilityId);
    if (!ability) return;

    // Check cooldown
    if ((state.abilityCooldowns[abilityId] || 0) > 0) return;

    // Check mana
    if (state.playerStats.mana < ability.manaCost) {
      this.addCombatLog('Not enough mana!', 'system');
      return;
    }

    // Deduct mana
    state.playerStats.mana -= ability.manaCost;

    // Calculate Cooldown with CDR stat
    const cdr = state.playerStats.calculated[StatType.CooldownReduction] || 0;
    const effectiveCooldown = ability.cooldownSec * (1 - Math.min(60, cdr) / 100);
    state.abilityCooldowns[abilityId] = effectiveCooldown;

    // Execute ability
    const px = state.player.x;
    const py = state.player.y;
    const aimAngle = state.player.facingAngle;

    if (ability.id === 1) {
      // Twin Slash: Melee cleave in arc
      sound.playSwing();
      state.player.isAttacking = true;
      state.player.attackAnimTimer = 0.25;

      const cleaveArc = 1.3;
      const hitRadius = ability.range;

      for (const enemy of state.enemies) {
        const dx = enemy.x - px;
        const dy = enemy.y - py;
        const dist = Math.hypot(dx, dy);

        if (dist <= hitRadius + enemy.size) {
          const angleToEnemy = Math.atan2(dy, dx);
          let diff = Math.abs(angleToEnemy - aimAngle);
          while (diff > Math.PI) diff -= Math.PI * 2;
          diff = Math.abs(diff);

          if (diff <= cleaveArc / 2) {
            this.applyPlayerDamageToEnemy(enemy, ability);
          }
        }
      }
    } else if (ability.id === 2) {
      // Inferno Burst: Ranged explosion
      sound.playFireball();
      const targetX = px + Math.cos(aimAngle) * ability.range;
      const targetY = py + Math.sin(aimAngle) * ability.range;

      // Spawn Fire projectile that travels to target and detonates
      state.projectiles.push({
        id: `fire-${this.nextEntityId++}`,
        sourceId: 'player',
        x: px,
        y: py,
        vx: Math.cos(aimAngle) * 350,
        vy: Math.sin(aimAngle) * 350,
        speed: 350,
        damage: ability.baseDamage,
        school: DamageSchool.Fire,
        flags: ability.damageFlags,
        radius: 8,
        rangeLeft: ability.range,
        color: '#f97316',
      });
    } else if (ability.id === 3) {
      // Frost Nova: Radial cold blast
      sound.playFrost();
      // Particles
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        state.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * 160,
          vy: Math.sin(angle) * 160,
          color: '#38bdf8',
          size: 4,
          life: 0.45,
          maxLife: 0.45,
        });
      }

      for (const enemy of state.enemies) {
        const dist = Math.hypot(enemy.x - px, enemy.y - py);
        if (dist <= ability.radius!) {
          this.applyPlayerDamageToEnemy(enemy, ability);
          // Apply chill status
          enemy.statusEffects = enemy.statusEffects.filter((s) => s.id !== 'chill');
          enemy.statusEffects.push({
            id: 'chill',
            name: 'Chilled',
            durationLeft: 4.0,
            totalDuration: 4.0,
            icon: 'Snowflake',
            color: '#38bdf8',
            tickTimer: 0,
            speedMultiplier: 0.45,
          });
        }
      }
    } else if (ability.id === 4) {
      // Aether Dash: Rapid teleport
      sound.playDash();
      const dashDist = ability.range;
      let targetX = px + Math.cos(aimAngle) * dashDist;
      let targetY = py + Math.sin(aimAngle) * dashDist;

      // Check collision
      const targetTile = state.dungeon.map.worldToTile(targetX, targetY);
      if (TileFlags.isWalkable(state.dungeon.map.get(targetTile.x, targetTile.y))) {
        // Dash trail
        for (let s = 0; s < 8; s++) {
          const tx = px + (targetX - px) * (s / 8);
          const ty = py + (targetY - py) * (s / 8);
          state.particles.push({
            x: tx,
            y: ty,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            color: '#a855f7',
            size: 5,
            life: 0.35,
            maxLife: 0.35,
          });
        }
        state.player.x = targetX;
        state.player.y = targetY;

        // Damage enemies passed through
        for (const enemy of state.enemies) {
          const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
          if (dist <= ability.radius!) {
            this.applyPlayerDamageToEnemy(enemy, ability);
          }
        }
      }
    }
  }

  private applyPlayerDamageToEnemy(enemy: EnemyEntity, ability: typeof PLAYER_ABILITIES[0]) {
    const state = this.state;
    const calc = resolveDamagePipeline({
      baseAmount: ability.baseDamage,
      school: ability.school,
      flags: ability.damageFlags,
      attackerAttackPower: state.playerStats.calculated[StatType.AttackPower],
      attackerSpellPower: state.playerStats.calculated[StatType.SpellPower],
      attackerCritChance: state.playerStats.calculated[StatType.CritChance],
      attackerCritMultiplier: state.playerStats.calculated[StatType.CritMultiplier],
      targetArmor: enemy.armor,
      targetEvasion: 0,
    });

    enemy.health -= calc.damage;
    enemy.isHitFlashTimer = 0.12;

    sound.playHit(calc.isCrit);

    // Floating text
    state.floatingTexts.push({
      id: `fct-${this.nextEntityId++}`,
      text: calc.isCrit ? `${calc.damage}!` : `${calc.damage}`,
      x: enemy.x + (Math.random() - 0.5) * 20,
      y: enemy.y,
      color: calc.isCrit ? '#facc15' : getSchoolColor(ability.school),
      isCrit: calc.isCrit,
      lifetime: 0.9,
      maxLifetime: 0.9,
    });

    // Particle splash
    for (let p = 0; p < 6; p++) {
      state.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140,
        color: getSchoolColor(ability.school),
        size: 3,
        life: 0.3,
        maxLife: 0.3,
      });
    }

    if (enemy.health <= 0) {
      this.handleEnemyKilled(enemy);
    }
  }

  private handleEnemyKilled(enemy: EnemyEntity) {
    const state = this.state;
    this.addCombatLog(`Slain ${enemy.name}! (+${enemy.xpReward} XP)`, 'kill');

    // Add XP & Gold
    state.playerStats.xp += enemy.xpReward;
    const goldDrop = Math.floor(Math.random() * 15) + 10;
    state.playerStats.gold += goldDrop;

    // Check level up
    while (state.playerStats.xp >= state.playerStats.xpToNextLevel) {
      state.playerStats.xp -= state.playerStats.xpToNextLevel;
      state.playerStats.level += 1;
      state.playerStats.xpToNextLevel = Math.round(state.playerStats.xpToNextLevel * 1.5);
      state.unallocatedStatPoints += 3;
      sound.playLevelUp();
      this.addCombatLog(`Leveled up to Level ${state.playerStats.level}! +3 Attribute Points`, 'system');

      // Full heal & mana on level up
      this.recalculatePlayerStats();
      state.playerStats.health = state.playerStats.calculated[StatType.MaxHealth];
      state.playerStats.mana = state.playerStats.calculated[StatType.MaxMana];
    }

    // Roll Loot
    const tableKey = enemy.archetype === 'dungeon_lord' ? 'boss' : enemy.archetype === 'necromancer' ? 'elite' : 'trash';
    const droppedItems = rollLoot(tableKey);

    for (const item of droppedItems) {
      state.lootDrops.push({
        id: `drop-${this.nextEntityId++}`,
        x: enemy.x + (Math.random() - 0.5) * 30,
        y: enemy.y + (Math.random() - 0.5) * 30,
        item,
        creationTime: Date.now(),
      });
      sound.playLootDrop();
    }

    if (enemy.archetype === 'dungeon_lord') {
      state.floorCleared = true;
      this.addCombatLog(`Floor Boss slain! The portal to the next depth has been unlocked!`, 'system');
    }
  }

  public update(dt: number) {
    const state = this.state;
    if (state.isGameOver || state.isVictory) return;

    // 1. Ability Cooldowns update
    for (const idStr of Object.keys(state.abilityCooldowns)) {
      const id = Number(idStr);
      if (state.abilityCooldowns[id] > 0) {
        state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
      }
    }

    // 2. Attack animation timer
    if (state.player.attackAnimTimer > 0) {
      state.player.attackAnimTimer -= dt;
      if (state.player.attackAnimTimer <= 0) {
        state.player.isAttacking = false;
      }
    }

    // 3. Player Movement
    let mx = 0;
    let my = 0;
    if (this.keyState['w'] || this.keyState['arrowup']) my -= 1;
    if (this.keyState['s'] || this.keyState['arrowdown']) my += 1;
    if (this.keyState['a'] || this.keyState['arrowleft']) mx -= 1;
    if (this.keyState['d'] || this.keyState['arrowright']) mx += 1;

    if (mx !== 0 && my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    const moveSpeedStat = state.playerStats.calculated[StatType.MoveSpeed];
    const actualSpeed = 160 * (moveSpeedStat / 100);

    const newX = state.player.x + mx * actualSpeed * dt;
    const newY = state.player.y + my * actualSpeed * dt;

    // Tile Collision Check for player
    const tileX = state.dungeon.map.worldToTile(newX, state.player.y);
    if (TileFlags.isWalkable(state.dungeon.map.get(tileX.x, tileX.y))) {
      state.player.x = newX;
    }
    const tileY = state.dungeon.map.worldToTile(state.player.x, newY);
    if (TileFlags.isWalkable(state.dungeon.map.get(tileY.x, tileY.y))) {
      state.player.y = newY;
    }

    // Smooth Camera Follow
    // Target isometric screen coordinates of player
    const cellX = state.player.x / 64;
    const cellY = state.player.y / 64;
    const targetCamX = (cellX - cellY) * 32;
    const targetCamY = (cellX + cellY) * 16;

    this.camera.x += (targetCamX - this.camera.x) * (dt * 6);
    this.camera.y += (targetCamY - this.camera.y) * (dt * 6);

    // Natural Mana & Health Regen
    state.playerStats.mana = Math.min(
      state.playerStats.calculated[StatType.MaxMana],
      state.playerStats.mana + (3 + state.playerStats.attributes[AttributeType.INT] * 0.4) * dt
    );

    // 4. Update Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.health <= 0) {
        state.enemies.splice(i, 1);
        continue;
      }

      if (enemy.isHitFlashTimer > 0) {
        enemy.isHitFlashTimer -= dt;
      }

      // Status effects (tick damage, speed mod)
      let currentSpeed = enemy.moveSpeed;
      for (let s = enemy.statusEffects.length - 1; s >= 0; s--) {
        const eff = enemy.statusEffects[s];
        eff.durationLeft -= dt;
        if (eff.speedMultiplier) {
          currentSpeed *= eff.speedMultiplier;
        }
        if (eff.damagePerTick) {
          eff.tickTimer += dt;
          if (eff.tickTimer >= 1.0) {
            eff.tickTimer = 0;
            enemy.health -= eff.damagePerTick;
            state.floatingTexts.push({
              id: `dot-${this.nextEntityId++}`,
              text: `${eff.damagePerTick}`,
              x: enemy.x,
              y: enemy.y,
              color: eff.color,
              isCrit: false,
              lifetime: 0.7,
              maxLifetime: 0.7,
            });
          }
        }
        if (eff.durationLeft <= 0) {
          enemy.statusEffects.splice(s, 1);
        }
      }

      // AI Behavior: Distance to player
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      enemy.facingAngle = Math.atan2(dy, dx);

      // Aggro radius
      if (dist < 380) {
        if (dist > enemy.attackRange) {
          // Move towards player
          const nx = enemy.x + (dx / dist) * currentSpeed * dt;
          const ny = enemy.y + (dy / dist) * currentSpeed * dt;

          const tCheck = state.dungeon.map.worldToTile(nx, ny);
          if (TileFlags.isWalkable(state.dungeon.map.get(tCheck.x, tCheck.y))) {
            enemy.x = nx;
            enemy.y = ny;
          }
        } else {
          // Attack in range
          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0) {
            enemy.attackTimer = enemy.attackCooldown;
            this.enemyAttack(enemy);
          }
        }
      }
    }

    // 5. Update Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      const step = proj.speed * dt;
      proj.x += (proj.vx / proj.speed) * step;
      proj.y += (proj.vy / proj.speed) * step;
      proj.rangeLeft -= step;

      // Particle trail
      state.particles.push({
        x: proj.x,
        y: proj.y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        color: proj.color,
        size: 3,
        life: 0.2,
        maxLife: 0.2,
      });

      // Wall collision
      const t = state.dungeon.map.worldToTile(proj.x, proj.y);
      if (TileFlags.blocksProjectiles(state.dungeon.map.get(t.x, t.y))) {
        state.projectiles.splice(i, 1);
        continue;
      }

      if (proj.sourceId === 'player') {
        // Hit enemies
        let hit = false;
        for (const enemy of state.enemies) {
          const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
          if (dist <= proj.radius + enemy.size) {
            this.applyPlayerDamageToEnemy(enemy, {
              id: 99,
              name: 'Spell Bolt',
              key: '',
              description: '',
              icon: '',
              baseDamage: proj.damage,
              school: proj.school,
              damageFlags: proj.flags,
              cooldownSec: 0,
              manaCost: 0,
              range: 0,
            });

            // If fire, trigger AoE explosion
            if (proj.school === DamageSchool.Fire) {
              for (const splash of state.enemies) {
                if (splash.id !== enemy.id && Math.hypot(splash.x - proj.x, splash.y - proj.y) <= 80) {
                  this.applyPlayerDamageToEnemy(splash, {
                    id: 99,
                    name: 'Fire Splash',
                    key: '',
                    description: '',
                    icon: '',
                    baseDamage: proj.damage * 0.6,
                    school: DamageSchool.Fire,
                    damageFlags: proj.flags,
                    cooldownSec: 0,
                    manaCost: 0,
                    range: 0,
                  });
                }
              }
            }

            hit = true;
            break;
          }
        }
        if (hit && !proj.isPiercing) {
          state.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy projectile hitting player
        const dist = Math.hypot(state.player.x - proj.x, state.player.y - proj.y);
        if (dist <= proj.radius + 16) {
          this.applyEnemyDamageToPlayer(proj.damage, proj.school);
          state.projectiles.splice(i, 1);
          continue;
        }
      }

      if (proj.rangeLeft <= 0) {
        state.projectiles.splice(i, 1);
      }
    }

    // 6. Loot Magnet / Pickup
    for (let i = state.lootDrops.length - 1; i >= 0; i--) {
      const drop = state.lootDrops[i];
      const dist = Math.hypot(state.player.x - drop.x, state.player.y - drop.y);

      // Magnet pull when close
      if (dist < 90) {
        drop.x += ((state.player.x - drop.x) / dist) * 180 * dt;
        drop.y += ((state.player.y - drop.y) / dist) * 180 * dt;
      }

      if (dist < 26) {
        // Try pick up into inventory
        const def = getItemDef(drop.item.itemDefId);
        if (this.addToInventory(drop.item)) {
          sound.playPotion();
          this.addCombatLog(`Picked up ${def?.name || 'Item'}!`, 'loot');
          state.lootDrops.splice(i, 1);
        }
      }
    }

    // 7. Chest interaction
    const playerTile = state.dungeon.map.worldToTile(state.player.x, state.player.y);
    if (state.dungeon.map.get(playerTile.x, playerTile.y) === TileType.Chest) {
      state.dungeon.map.set(playerTile.x, playerTile.y, TileType.Floor);
      sound.playLootDrop();
      const drops = rollLoot('chest');
      for (const d of drops) {
        state.lootDrops.push({
          id: `chest-${this.nextEntityId++}`,
          x: state.player.x + (Math.random() - 0.5) * 40,
          y: state.player.y + (Math.random() - 0.5) * 40,
          item: d,
          creationTime: Date.now(),
        });
      }
      this.addCombatLog('Opened an Ancient Treasure Chest!', 'loot');
    }

    // 8. Exit Portal interaction
    if (
      playerTile.x === state.dungeon.exitTile.x &&
      playerTile.y === state.dungeon.exitTile.y &&
      state.floorCleared
    ) {
      if (state.currentFloor >= 3) {
        state.isVictory = true;
        this.addCombatLog('YOU HAVE CONQUERED THE ABYSS! VICTORY!', 'system');
      } else {
        this.advanceToNextFloor();
      }
    }

    // 9. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // 10. Update Floating Combat Texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const fct = state.floatingTexts[i];
      fct.lifetime -= dt;
      if (fct.lifetime <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }
  }

  private enemyAttack(enemy: EnemyEntity) {
    const state = this.state;
    const px = state.player.x;
    const py = state.player.y;
    const angle = Math.atan2(py - enemy.y, px - enemy.x);

    if (enemy.archetype === 'skeleton_warrior' || enemy.archetype === 'dungeon_lord') {
      sound.playSwing();
      // Melee strike
      this.applyEnemyDamageToPlayer(enemy.attackPower, DamageSchool.Physical);
    } else if (enemy.archetype === 'goblin_archer') {
      // Shoot arrow
      state.projectiles.push({
        id: `arrow-${this.nextEntityId++}`,
        sourceId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 280,
        vy: Math.sin(angle) * 280,
        speed: 280,
        damage: enemy.attackPower,
        school: DamageSchool.Physical,
        flags: 0,
        radius: 4,
        rangeLeft: 240,
        color: '#facc15',
      });
    } else if (enemy.archetype === 'necromancer') {
      // Cast shadow orb
      sound.playFrost();
      state.projectiles.push({
        id: `shadow-${this.nextEntityId++}`,
        sourceId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        speed: 220,
        damage: enemy.attackPower,
        school: DamageSchool.Shadow,
        flags: 0,
        radius: 8,
        rangeLeft: 260,
        color: '#a855f7',
      });
    }
  }

  private applyEnemyDamageToPlayer(baseDamage: number, school: DamageSchool) {
    const state = this.state;
    const calc = resolveDamagePipeline({
      baseAmount: baseDamage,
      school,
      flags: DAMAGE_FLAGS.FLAG_CAN_CRIT,
      attackerAttackPower: baseDamage,
      attackerSpellPower: baseDamage,
      attackerCritChance: 5,
      attackerCritMultiplier: 150,
      targetArmor: state.playerStats.calculated[StatType.Armor],
      targetEvasion: state.playerStats.calculated[StatType.Evasion],
    });

    if (calc.isEvaded) {
      state.floatingTexts.push({
        id: `evade-${this.nextEntityId++}`,
        text: 'Evaded!',
        x: state.player.x,
        y: state.player.y,
        color: '#94a3b8',
        isCrit: false,
        lifetime: 0.8,
        maxLifetime: 0.8,
      });
      return;
    }

    state.playerStats.health -= calc.damage;
    sound.playHit(false);

    state.floatingTexts.push({
      id: `p-hit-${this.nextEntityId++}`,
      text: `-${calc.damage}`,
      x: state.player.x,
      y: state.player.y,
      color: '#ef4444',
      isCrit: calc.isCrit,
      lifetime: 0.9,
      maxLifetime: 0.9,
    });

    if (state.playerStats.health <= 0) {
      state.playerStats.health = 0;
      state.isGameOver = true;
      this.addCombatLog('You succumbed to the dungeon horrors... Game Over.', 'system');
    }
  }

  public advanceToNextFloor() {
    const nextFloor = this.state.currentFloor + 1;
    const prevStats = this.state.playerStats;
    const prevEquip = this.state.equipment;
    const prevInv = this.state.inventory;

    const newDungeon = generateDungeonLevel(nextFloor);
    this.state.currentFloor = nextFloor;
    this.state.dungeon = newDungeon;
    this.state.player.x = newDungeon.playerSpawn.x;
    this.state.player.y = newDungeon.playerSpawn.y;
    this.state.floorCleared = false;
    this.state.enemies = [];
    this.state.projectiles = [];
    this.state.lootDrops = [];
    this.state.particles = [];
    this.state.floatingTexts = [];
    this.state.equipment = prevEquip;
    this.state.inventory = prevInv;
    this.state.playerStats = prevStats;

    this.spawnFloorEnemies(this.state, newDungeon, nextFloor);
    this.addCombatLog(`Descended into Floor ${nextFloor}! Be on your guard!`, 'system');
  }

  public useItem(index: number) {
    const state = this.state;
    const item = state.inventory[index];
    if (!item) return;

    const def = getItemDef(item.itemDefId);
    if (!def) return;

    if (def.slot !== EquipSlot.None) {
      // Equip item
      const currentEquipped = state.equipment[def.slot];
      state.equipment[def.slot] = item;
      state.inventory[index] = currentEquipped; // Swap or null
      this.recalculatePlayerStats();
      this.addCombatLog(`Equipped ${def.name}.`, 'system');
      sound.playPotion();
    } else {
      // Consumable
      if (def.id === 10) {
        // Health Potion (+50 HP)
        const maxHp = state.playerStats.calculated[StatType.MaxHealth];
        state.playerStats.health = Math.min(maxHp, state.playerStats.health + 50);
        sound.playPotion();
        this.addCombatLog('Consumed Health Elixir (+50 HP).', 'heal');
      } else if (def.id === 11) {
        // Mana Flask (+40 Mana)
        const maxMana = state.playerStats.calculated[StatType.MaxMana];
        state.playerStats.mana = Math.min(maxMana, state.playerStats.mana + 40);
        sound.playPotion();
        this.addCombatLog('Consumed Mana Flask (+40 MP).', 'heal');
      }

      if (item.count > 1) {
        item.count--;
      } else {
        state.inventory[index] = null;
      }
    }
  }

  public unequipItem(slot: EquipSlot) {
    const state = this.state;
    const equipped = state.equipment[slot];
    if (!equipped) return;

    if (this.addToInventory(equipped)) {
      state.equipment[slot] = null;
      this.recalculatePlayerStats();
      const def = getItemDef(equipped.itemDefId);
      this.addCombatLog(`Unequipped ${def?.name || 'gear'}.`, 'system');
    } else {
      this.addCombatLog('Inventory full!', 'system');
    }
  }

  public allocateAttribute(attr: AttributeType) {
    if (this.state.unallocatedStatPoints <= 0) return;
    this.state.unallocatedStatPoints--;
    this.state.playerStats.attributes[attr]++;
    this.recalculatePlayerStats();
    this.addCombatLog(`Increased ${AttributeType[attr]} to ${this.state.playerStats.attributes[attr]}!`, 'system');
  }

  public recalculatePlayerStats() {
    const prevMaxHp = this.state.playerStats.calculated[StatType.MaxHealth];
    const prevMaxMp = this.state.playerStats.calculated[StatType.MaxMana];

    this.state.playerStats.calculated = computeTotalStats(
      this.state.playerStats.attributes,
      this.state.equipment
    );

    const newMaxHp = this.state.playerStats.calculated[StatType.MaxHealth];
    const newMaxMp = this.state.playerStats.calculated[StatType.MaxMana];

    // Maintain ratio or add difference
    if (newMaxHp > prevMaxHp) {
      this.state.playerStats.health += newMaxHp - prevMaxHp;
    }
    if (newMaxMp > prevMaxMp) {
      this.state.playerStats.mana += newMaxMp - prevMaxMp;
    }
    this.state.playerStats.health = Math.min(this.state.playerStats.health, newMaxHp);
    this.state.playerStats.mana = Math.min(this.state.playerStats.mana, newMaxMp);
  }

  public addToInventory(stack: ItemStack): boolean {
    const inv = this.state.inventory;

    // Check stacking for consumables
    const def = getItemDef(stack.itemDefId);
    if (def && def.slot === EquipSlot.None) {
      for (let i = 0; i < inv.length; i++) {
        const slot = inv[i];
        if (slot && slot.itemDefId === stack.itemDefId) {
          slot.count += stack.count;
          return true;
        }
      }
    }

    // Find empty slot
    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) {
        inv[i] = stack;
        return true;
      }
    }
    return false;
  }

  public addCombatLog(text: string, type: CombatLogEntry['type']) {
    this.state.combatLogs.unshift({
      id: `log-${this.nextEntityId++}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    });
    if (this.state.combatLogs.length > 50) {
      this.state.combatLogs.pop();
    }
  }
}
