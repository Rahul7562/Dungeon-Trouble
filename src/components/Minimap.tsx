import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { TileType } from '../engine/types';
import { Compass } from 'lucide-react';

interface MinimapProps {
  engine: GameEngine;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isTown = engine.state.currentZone === 'town';
    const map = isTown ? engine.state.townLevel.map : engine.state.dungeon.map;
    const { player, enemies } = engine.state;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / map.width;
    const scaleY = canvas.height / map.height;

    // Draw explored / walkable tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const type = map.get(x, y);
        if (type === TileType.Floor) {
          ctx.fillStyle = isTown ? '#1e293b' : '#1e293b';
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        } else if (type === TileType.Exit) {
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(x * scaleX, y * scaleY, scaleX + 1, scaleY + 1);
        } else if (type === TileType.Chest) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x * scaleX, y * scaleY, scaleX + 1, scaleY + 1);
        }
      }
    }

    // In town: draw NPCs as amber dots
    if (isTown) {
      ctx.fillStyle = '#fbbf24';
      for (const npc of engine.state.townLevel.npcs) {
        const nt = map.worldToTile(npc.x, npc.y);
        ctx.beginPath();
        ctx.arc(nt.x * scaleX, nt.y * scaleY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // In dungeon: draw enemies as red dots
      ctx.fillStyle = '#ef4444';
      for (const enemy of enemies) {
        const et = map.worldToTile(enemy.x, enemy.y);
        ctx.beginPath();
        ctx.arc(et.x * scaleX, et.y * scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw player as bright cyan dot
    const pt = map.worldToTile(player.x, player.y);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pt.x * scaleX, pt.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [
    engine,
    engine.state.currentZone,
    engine.state.player.x,
    engine.state.player.y,
    engine.state.enemies.length,
  ]);

  const isTown = engine.state.currentZone === 'town';

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-2xl p-2 shadow-2xl select-none">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>{isTown ? 'Sanctuary Map' : 'Chamber Radar'}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          {isTown ? 'Town-1' : `Floor ${engine.state.currentFloor}`}
        </span>
      </div>
      <canvas
        id="minimap-canvas"
        ref={canvasRef}
        width={130}
        height={130}
        className="rounded-lg border border-slate-800/80 block"
      />
    </div>
  );
};
