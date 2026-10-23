import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { TileType, TimeOfDayPhase } from '../engine/types';
import { TileMap } from '../engine/world';
import {
  computeDaylightState,
  isPlayerInsideBuilding,
  TOWN_TILE_FLAG_TREE,
  TOWN_TILE_FLAG_ROAD,
  TOWN_TILE_FLAG_INTERIOR_OAK,
  TOWN_TILE_FLAG_INTERIOR_STONE,
  TOWN_TILE_FLAG_INTERIOR_CARPET,
} from '../engine/town';
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CloudSun,
  Sparkles,
  Home,
  ZoomIn,
  Settings,
  FastForward,
} from 'lucide-react';

interface MinimapProps {
  engine: GameEngine;
  onOpenMenu?: () => void;
}

function getPhaseVisuals(phase: TimeOfDayPhase) {
  switch (phase) {
    case 'Dawn':
      return {
        Icon: Sunrise,
        iconColor: 'text-rose-400',
        badgeBg: 'bg-rose-950/85 border-rose-600/60 text-rose-200',
        barGradient: 'from-indigo-500 via-rose-400 to-amber-300',
      };
    case 'Morning':
      return {
        Icon: CloudSun,
        iconColor: 'text-amber-300',
        badgeBg: 'bg-amber-950/85 border-amber-600/60 text-amber-200',
        barGradient: 'from-rose-400 via-amber-300 to-sky-400',
      };
    case 'Afternoon':
      return {
        Icon: Sun,
        iconColor: 'text-yellow-300',
        badgeBg: 'bg-sky-950/85 border-sky-600/60 text-sky-200',
        barGradient: 'from-amber-300 via-yellow-300 to-orange-400',
      };
    case 'Evening':
      return {
        Icon: Sunset,
        iconColor: 'text-orange-400',
        badgeBg: 'bg-orange-950/85 border-orange-600/60 text-orange-200',
        barGradient: 'from-yellow-400 via-orange-500 to-purple-500',
      };
    case 'Dusk':
      return {
        Icon: Sparkles,
        iconColor: 'text-purple-300',
        badgeBg: 'bg-purple-950/85 border-purple-600/60 text-purple-200',
        barGradient: 'from-orange-500 via-purple-600 to-indigo-900',
      };
    case 'Night':
    default:
      return {
        Icon: Moon,
        iconColor: 'text-indigo-300',
        badgeBg: 'bg-indigo-950/90 border-indigo-600/70 text-indigo-200',
        barGradient: 'from-indigo-900 via-indigo-500 to-slate-800',
      };
  }
}

export const Minimap: React.FC<MinimapProps> = ({ engine, onOpenMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerRef = useRef<{ map: TileMap; canvas: HTMLCanvasElement } | null>(null);

  const isTown = engine.state.currentZone === 'town';
  const worldTimeHours = engine.state.worldTimeHours ?? 9.5;
  const daylight = computeDaylightState(worldTimeHours);
  const phaseVisuals = getPhaseVisuals(daylight.phase);
  const PhaseIcon = phaseVisuals.Icon;

  const currentBuilding = isTown
    ? engine.state.townLevel.buildings.find((b) =>
        isPlayerInsideBuilding(
          engine.state.player.x,
          engine.state.player.y,
          engine.state.townLevel.map,
          b
        )
      )
    : undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = isTown ? engine.state.townLevel.map : engine.state.dungeon.map;
    const { player, enemies } = engine.state;
    const scaleX = canvas.width / map.width;
    const scaleY = canvas.height / map.height;

    if (!staticLayerRef.current || staticLayerRef.current.map !== map) {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.fillStyle = '#070a12';
        octx.fillRect(0, 0, offscreen.width, offscreen.height);

        const tileFlags = isTown ? engine.state.townLevel.tileFlags : null;
        const mapW = map.width;

        for (let y = 0; y < map.height; y++) {
          const rowOff = y * mapW;
          for (let x = 0; x < mapW; x++) {
            const type = map.get(x, y);
            const flags = tileFlags ? tileFlags[rowOff + x] : 0;
            if (type === TileType.Floor) {
              if (isTown) {
                const isInterior =
                  (flags &
                    (TOWN_TILE_FLAG_INTERIOR_OAK |
                      TOWN_TILE_FLAG_INTERIOR_STONE |
                      TOWN_TILE_FLAG_INTERIOR_CARPET)) !==
                  0;
                const isRoad = (flags & TOWN_TILE_FLAG_ROAD) !== 0;
                octx.fillStyle = isInterior ? '#6b4c35' : isRoad ? '#8a7e6e' : '#235331';
              } else {
                octx.fillStyle = '#334155';
              }
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Wall && isTown) {
              const isTree = (flags & TOWN_TILE_FLAG_TREE) !== 0;
              octx.fillStyle = isTree ? '#143820' : '#9a8873';
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Water) {
              octx.fillStyle = '#0ea5e9';
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Exit) {
              octx.fillStyle = '#c084fc';
              octx.fillRect(x * scaleX, y * scaleY, scaleX + 2, scaleY + 2);
            } else if (type === TileType.Chest) {
              octx.fillStyle = '#fbbf24';
              octx.fillRect(x * scaleX, y * scaleY, scaleX + 1.5, scaleY + 1.5);
            }
          }
        }

        if (isTown) {
          octx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          octx.lineWidth = 0.8;
          for (const b of engine.state.townLevel.buildings) {
            octx.strokeRect(b.x * scaleX, b.y * scaleY, b.w * scaleX, b.h * scaleY);
            if (b.wing) {
              octx.strokeRect(
                b.wing.x * scaleX,
                b.wing.y * scaleY,
                b.wing.w * scaleX,
                b.wing.h * scaleY
              );
            }
          }
        }
      }
      staticLayerRef.current = { map, canvas: offscreen };
    }

    ctx.drawImage(staticLayerRef.current.canvas, 0, 0);

    if (isTown) {
      if (currentBuilding) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(
          currentBuilding.x * scaleX,
          currentBuilding.y * scaleY,
          currentBuilding.w * scaleX,
          currentBuilding.h * scaleY
        );
      }

      // Facility NPCs (bright gold)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      for (const npc of engine.state.townLevel.npcs) {
        if (npc.role === 'villager') continue;
        const nt = map.worldToTile(npc.x, npc.y);
        const cx = (nt.x + 0.5) * scaleX;
        const cy = (nt.y + 0.5) * scaleY;
        ctx.moveTo(cx + 2.6, cy);
        ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      }
      ctx.fill();

      // Villagers (warm amber)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (const npc of engine.state.townLevel.npcs) {
        if (npc.role !== 'villager') continue;
        const nt = map.worldToTile(npc.x, npc.y);
        const cx = (nt.x + 0.5) * scaleX;
        const cy = (nt.y + 0.5) * scaleY;
        ctx.moveTo(cx + 1.8, cy);
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      // Dungeon enemies (bright crimson)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      for (const enemy of enemies) {
        const et = map.worldToTile(enemy.x, enemy.y);
        const cx = (et.x + 0.5) * scaleX;
        const cy = (et.y + 0.5) * scaleY;
        ctx.moveTo(cx + 2.2, cy);
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Player marker (glowing cyan-emerald)
    const pt = map.worldToTile(player.x, player.y);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
    ctx.beginPath();
    ctx.arc((pt.x + 0.5) * scaleX, (pt.y + 0.5) * scaleY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc((pt.x + 0.5) * scaleX, (pt.y + 0.5) * scaleY, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const dayProgressPercent = Math.min(100, Math.max(0, (daylight.timeHours / 24) * 100));

  return (
    <div className="pointer-events-auto absolute top-3 right-3 z-20 flex flex-col items-end gap-2 select-none">
      {/* Ornate Circular Compass Radar Frame (Matching image_5f5e217c.png) */}
      <div className="relative w-[166px] h-[166px] flex items-center justify-center">
        {/* Outer Dark-Iron & Gold Beveled Compass Ring */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-stone-700 via-stone-900 to-stone-950 border-[3px] border-amber-500 shadow-[0_10px_30px_rgba(0,0,0,0.95)]" />
        <div className="absolute inset-2.5 rounded-full border border-amber-300/50 pointer-events-none" />

        {/* 4 Cardinal Gold Compass Spikes (N, S, E, W) */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border border-stone-950 shadow z-10" />
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border border-stone-950 shadow z-10" />
        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-4 h-4 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border border-stone-950 shadow z-10" />
        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-4 h-4 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border border-stone-950 shadow z-10" />

        {/* Circular Clipped Minimap Canvas */}
        <div className="relative w-[138px] h-[138px] rounded-full overflow-hidden border-2 border-amber-600/80 bg-slate-950 shadow-inner">
          <canvas
            id="minimap-canvas"
            ref={canvasRef}
            width={138}
            height={138}
            className="w-full h-full block"
          />
        </div>

        {/* Satellite Button 1 (Top-Right Rim): Settings / Pause Menu Gear */}
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            title="Pause & Settings (Esc)"
            className="absolute top-1 right-1 z-20 w-8 h-8 rounded-full bg-gradient-to-b from-stone-700 to-stone-900 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-lg flex items-center justify-center text-amber-300 transition active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Satellite Button 2 (Bottom-Right Rim): 2.5D Camera Zoom Toggle (Magnifying Glass) */}
        <button
          id="minimap-zoom-btn"
          onClick={() => engine.cycleCameraZoom()}
          title={`Cycle 2.5D Camera Zoom (Current: ${(engine.cameraZoom || 1.22).toFixed(2)}x • Or use Mouse Wheel)`}
          className="absolute bottom-2 right-0.5 z-20 w-8 h-8 rounded-full bg-gradient-to-b from-stone-700 to-stone-900 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-lg flex items-center justify-center text-amber-200 transition active:scale-95"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Satellite Badge (Bottom-Left Rim): Zone / Floor Indicator */}
        <div className="absolute bottom-1 left-1 z-20 px-2 py-0.5 rounded-full bg-stone-900/95 border border-amber-500/80 text-[10px] font-cinzel font-bold text-amber-300 shadow">
          {isTown ? 'Town-1' : `F${engine.state.currentFloor}`}
        </div>
      </div>

      {/* Active Building Interior Banner when inside a Medieval House */}
      {isTown && currentBuilding && (
        <div className="flex items-center gap-1.5 bg-stone-900/95 border border-amber-500/70 rounded-lg px-2.5 py-1 text-[10px] text-amber-200 font-cinzel font-bold shadow-lg">
          <Home className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate max-w-[140px]">{currentBuilding.name}</span>
        </div>
      )}

      {/* Overworld Daylight Chronometer Bar (Town-1) */}
      {isTown && (
        <div
          id="daylight-clock-widget"
          className="w-[166px] bg-gradient-to-b from-stone-900/95 to-stone-950/95 border border-amber-500/60 rounded-xl px-2.5 py-1.5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <PhaseIcon className={`w-3.5 h-3.5 ${phaseVisuals.iconColor} shrink-0`} />
              <span className="font-mono text-[11px] font-bold tracking-tight text-amber-100 tabular-nums">
                {daylight.formattedTime}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`text-[9px] font-cinzel font-bold px-1.5 py-0.5 rounded border ${phaseVisuals.badgeBg}`}
              >
                {daylight.phase}
              </span>
              <button
                onClick={() => engine.advanceWorldTime(3)}
                title="Advance Time +3 Hours"
                className="p-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-amber-300 transition"
              >
                <FastForward className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <div className="mt-1 relative h-1.5 w-full rounded-full bg-stone-950 overflow-hidden border border-stone-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${phaseVisuals.barGradient} transition-all duration-300`}
              style={{ width: `${dayProgressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
