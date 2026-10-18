import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { IsometricRenderer } from '../engine/renderer';
import { StatType } from '../engine/types';

interface GameCanvasProps {
  engine: GameEngine;
  onEngineTick: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onEngineTick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<IsometricRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      if (!rendererRef.current) {
        rendererRef.current = new IsometricRenderer(ctx, w, h);
      } else {
        rendererRef.current.resize(w, h);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing into an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.key, e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.key, e.code);
    };

    const handleBlur = () => {
      engine.clearInput();
    };

    let mouseClientX = window.innerWidth / 2;
    let mouseClientY = window.innerHeight / 2;

    const updateFacing = () => {
      if (rendererRef.current) {
        const worldMouse = rendererRef.current.screenToWorld(mouseClientX, mouseClientY, engine.camera);
        engine.worldMousePos = worldMouse;
        const dx = worldMouse.x - engine.state.player.x;
        const dy = worldMouse.y - engine.state.player.y;
        if (Math.hypot(dx, dy) > 2) {
          engine.state.player.facingAngle = Math.atan2(dy, dx);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseClientX = e.clientX;
      mouseClientY = e.clientY;
      engine.mousePos = { x: e.clientX, y: e.clientY };
      updateFacing();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click = Primary attack (Ability 1) or interact in town
        if (engine.state.currentZone === 'town' && engine.canInteract()) {
          engine.interact();
        } else {
          engine.triggerAbility(1);
        }
      } else if (e.button === 2) {
        // Right click = Secondary ability (Ability 2)
        engine.triggerAbility(2);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Main Game Loop
    let lastTime = performance.now();
    let animId: number;
    let tickAccumulator = 0;

    const gameLoop = (now: number) => {
      const elapsedSec = (now - lastTime) / 1000;
      lastTime = now;
      // Clamp dt between 0.001s and 0.05s to prevent tunneling or teleporting on lag spikes
      const dt = Math.min(0.05, Math.max(0.001, elapsedSec));

      engine.update(dt);
      updateFacing();

      // Throttle React HUD updates to ~15 fps to prevent React re-render lag spikes
      tickAccumulator += dt;
      if (tickAccumulator >= 0.066) {
        tickAccumulator = 0;
        onEngineTick();
      }

      if (rendererRef.current) {
        const maxHp = engine.state.playerStats.calculated[StatType.MaxHealth];
        const shake = engine.state.screenShake || 0;
        const shakenCamera = {
          x: engine.camera.x + (shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0),
          y: engine.camera.y + (shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0),
        };
        const isTown = engine.state.currentZone === 'town';
        const currentMap = isTown ? engine.state.townLevel.map : engine.state.dungeon.map;
        const npcs = isTown ? engine.state.townLevel.npcs : [];
        const fountainPos = isTown ? engine.state.townLevel.fountainPos : null;
        const isMoving =
          engine.isMoveActive('up') ||
          engine.isMoveActive('down') ||
          engine.isMoveActive('left') ||
          engine.isMoveActive('right');

        rendererRef.current.render(
          currentMap,
          shakenCamera,
          {
            x: engine.state.player.x,
            y: engine.state.player.y,
            vx: isMoving ? 10 : 0,
            vy: isMoving ? 10 : 0,
            facingAngle: engine.state.player.facingAngle,
            isAttacking: engine.state.player.isAttacking,
            attackAnimTimer: engine.state.player.attackAnimTimer,
            health: engine.state.playerStats.health,
            maxHealth: maxHp,
            playerName: engine.state.playerName,
            playerClass: engine.state.selectedClass,
            hitFlashTimer: engine.state.player.hitFlashTimer,
            statusEffects: engine.state.player.statusEffects,
          },
          engine.state.enemies,
          engine.state.projectiles,
          engine.state.lootDrops,
          engine.state.particles,
          engine.state.floatingTexts,
          now / 1000,
          engine.state.telegraphs || [],
          npcs,
          engine.state.activeNPC,
          engine.state.summons || [],
          fountainPos,
          engine.state.dungeon?.theme,
          isTown ? engine.state.townLevel?.props || [] : engine.state.dungeon?.props || [],
          isTown
        );
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [engine, onEngineTick]);

  return (
    <canvas
      id="dungeon-canvas"
      ref={canvasRef}
      className="absolute inset-0 block w-full h-full cursor-crosshair z-0"
    />
  );
};
