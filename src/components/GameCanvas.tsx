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

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const updateSize = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = viewW * viewH > 1_000_000 ? 1 : Math.min(1.5, rawDpr);
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (!rendererRef.current) {
        rendererRef.current = new IsometricRenderer(ctx, viewW, viewH);
      } else {
        rendererRef.current.resize(viewW, viewH);
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
        if (dx * dx + dy * dy > 4) {
          engine.state.player.facingAngle = Math.atan2(dy, dx);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseClientX = e.clientX;
      mouseClientY = e.clientY;
      engine.mousePos.x = e.clientX;
      engine.mousePos.y = e.clientY;
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
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Main Game Loop
    let lastTime = performance.now();
    let animId: number;
    let tickAccumulator = 0;
    const shakenCamera = { x: 0, y: 0 };
    const playerRenderState = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facingAngle: 0,
      isAttacking: false,
      attackAnimTimer: 0,
      health: 100,
      maxHealth: 100,
      playerName: '',
      playerClass: engine.state.selectedClass,
      hitFlashTimer: 0 as number | undefined,
      statusEffects: engine.state.player.statusEffects,
    };

    const gameLoop = (now: number) => {
      const elapsedSec = (now - lastTime) / 1000;
      lastTime = now;
      // Clamp dt between 0.001s and 0.05s to prevent tunneling or teleporting on lag spikes
      const dt = Math.min(0.05, Math.max(0.001, elapsedSec));

      engine.update(dt);
      if (!engine.isPaused) {
        updateFacing();
        tickAccumulator += dt;
        if (tickAccumulator >= 0.15) {
          tickAccumulator = 0;
          onEngineTick();
        }
      }

      if (rendererRef.current) {
        const renderer = rendererRef.current;
        const maxHp = engine.state.playerStats.calculated[StatType.MaxHealth];
        const shake = engine.state.screenShake || 0;
        shakenCamera.x = engine.camera.x + (shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0);
        shakenCamera.y = engine.camera.y + (shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0);

        const isTown = engine.state.currentZone === 'town';
        const currentMap = isTown ? engine.state.townLevel.map : engine.state.dungeon.map;
        const fountainPos = isTown ? engine.state.townLevel.fountainPos : null;
        const isMoving =
          engine.isMoveActive('up') ||
          engine.isMoveActive('down') ||
          engine.isMoveActive('left') ||
          engine.isMoveActive('right');

        // Compute world-space viewport AABB from the 4 screen corners and query GameEngine SpatialGrid
        const pad = 220;
        const cNW = renderer.screenToWorld(-pad, -pad, shakenCamera);
        const cNE = renderer.screenToWorld(viewW + pad, -pad, shakenCamera);
        const cSW = renderer.screenToWorld(-pad, viewH + pad, shakenCamera);
        const cSE = renderer.screenToWorld(viewW + pad, viewH + pad, shakenCamera);
        const minWX = Math.min(cNW.x, cNE.x, cSW.x, cSE.x);
        const maxWX = Math.max(cNW.x, cNE.x, cSW.x, cSE.x);
        const minWY = Math.min(cNW.y, cNE.y, cSW.y, cSE.y);
        const maxWY = Math.max(cNW.y, cNE.y, cSW.y, cSE.y);

        const visible = engine.getVisibleEntities(minWX, minWY, maxWX, maxWY);

        playerRenderState.x = engine.state.player.x;
        playerRenderState.y = engine.state.player.y;
        playerRenderState.vx = isMoving ? 10 : 0;
        playerRenderState.vy = isMoving ? 10 : 0;
        playerRenderState.facingAngle = engine.state.player.facingAngle;
        playerRenderState.isAttacking = engine.state.player.isAttacking;
        playerRenderState.attackAnimTimer = engine.state.player.attackAnimTimer;
        playerRenderState.health = engine.state.playerStats.health;
        playerRenderState.maxHealth = maxHp;
        playerRenderState.playerName = engine.state.playerName;
        playerRenderState.playerClass = engine.state.selectedClass;
        playerRenderState.hitFlashTimer = engine.state.player.hitFlashTimer;
        playerRenderState.statusEffects = engine.state.player.statusEffects;

        renderer.render(
          currentMap,
          shakenCamera,
          playerRenderState,
          visible.enemies,
          engine.state.projectiles,
          visible.lootDrops,
          engine.state.particles,
          engine.state.floatingTexts,
          now / 1000,
          engine.state.telegraphs || [],
          visible.npcs,
          engine.state.activeNPC,
          engine.state.summons || [],
          fountainPos,
          engine.state.dungeon?.theme,
          visible.props,
          isTown,
          isTown ? engine.state.townLevel : undefined,
          engine.state.worldTimeHours ?? 9.5
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
