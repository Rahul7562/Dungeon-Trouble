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
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.key);
    };

    const handleMouseMove = (e: MouseEvent) => {
      engine.mousePos = { x: e.clientX, y: e.clientY };
      if (rendererRef.current) {
        const worldMouse = rendererRef.current.screenToWorld(e.clientX, e.clientY, engine.camera);
        const dx = worldMouse.x - engine.state.player.x;
        const dy = worldMouse.y - engine.state.player.y;
        engine.state.player.facingAngle = Math.atan2(dy, dx);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click = Primary attack (Ability 1)
        engine.triggerAbility(1);
      } else if (e.button === 2) {
        // Right click = Inferno Burst (Ability 2)
        engine.triggerAbility(2);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Main Game Loop
    let lastTime = performance.now();
    let animId: number;

    const gameLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      engine.update(dt);
      onEngineTick();

      if (rendererRef.current) {
        const maxHp = engine.state.playerStats.calculated[StatType.MaxHealth];
        rendererRef.current.render(
          engine.state.dungeon.map,
          engine.camera,
          {
            x: engine.state.player.x,
            y: engine.state.player.y,
            facingAngle: engine.state.player.facingAngle,
            isAttacking: engine.state.player.isAttacking,
            attackAnimTimer: engine.state.player.attackAnimTimer,
            health: engine.state.playerStats.health,
            maxHealth: maxHp,
          },
          engine.state.enemies,
          engine.state.projectiles,
          engine.state.lootDrops,
          engine.state.particles,
          engine.state.floatingTexts,
          now / 1000
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
