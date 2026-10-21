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
import { Compass, Sun, Sunrise, Sunset, Moon, CloudSun, Sparkles, Home } from 'lucide-react';

interface MinimapProps {
  engine: GameEngine;
}

function getPhaseVisuals(phase: TimeOfDayPhase) {
  switch (phase) {
    case 'Dawn':
      return {
        Icon: Sunrise,
        iconColor: 'text-rose-400',
        badgeBg: 'bg-rose-950/80 border-rose-700/60 text-rose-200',
        barGradient: 'from-indigo-500 via-rose-400 to-amber-300',
        glowColor: 'shadow-rose-500/15',
      };
    case 'Morning':
      return {
        Icon: CloudSun,
        iconColor: 'text-amber-300',
        badgeBg: 'bg-amber-950/75 border-amber-700/60 text-amber-200',
        barGradient: 'from-rose-400 via-amber-300 to-sky-400',
        glowColor: 'shadow-amber-400/15',
      };
    case 'Afternoon':
      return {
        Icon: Sun,
        iconColor: 'text-yellow-300',
        badgeBg: 'bg-sky-950/80 border-sky-700/60 text-sky-200',
        barGradient: 'from-amber-300 via-yellow-300 to-orange-400',
        glowColor: 'shadow-yellow-400/15',
      };
    case 'Evening':
      return {
        Icon: Sunset,
        iconColor: 'text-orange-400',
        badgeBg: 'bg-orange-950/80 border-orange-700/60 text-orange-200',
        barGradient: 'from-yellow-400 via-orange-500 to-purple-500',
        glowColor: 'shadow-orange-500/20',
      };
    case 'Dusk':
      return {
        Icon: Sparkles,
        iconColor: 'text-purple-300',
        badgeBg: 'bg-purple-950/85 border-purple-700/60 text-purple-200',
        barGradient: 'from-orange-500 via-purple-600 to-indigo-900',
        glowColor: 'shadow-purple-500/20',
      };
    case 'Night':
    default:
      return {
        Icon: Moon,
        iconColor: 'text-indigo-300',
        badgeBg: 'bg-indigo-950/90 border-indigo-700/70 text-indigo-200',
        barGradient: 'from-indigo-900 via-indigo-500 to-slate-800',
        glowColor: 'shadow-indigo-500/20',
      };
  }
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerRef = useRef<{ map: TileMap; canvas: HTMLCanvasElement } | null>(null);

  const isTown = engine.state.currentZone === 'town';
  const worldTimeHours = engine.state.worldTimeHours ?? 9.5;
  const daylight = computeDaylightState(worldTimeHours);
  const phaseVisuals = getPhaseVisuals(daylight.phase);
  const PhaseIcon = phaseVisuals.Icon;

  // Check if player is currently inside any building in Town-1
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

  // Compute human-readable countdown / next transition hint for the player
  const nextTransitionLabel = (() => {
    const h = daylight.timeHours;
    if (h < 5.0) return 'Dawn at 05:00 AM';
    if (h < 7.5) return 'Morning at 07:30 AM';
    if (h < 12.0) return 'Afternoon at 12:00 PM';
    if (h < 16.5) return 'Evening at 04:30 PM';
    if (h < 19.25) return 'Dusk at 07:15 PM';
    if (h < 21.0) return 'Night at 09:00 PM';
    return 'Dawn at 05:00 AM';
  })();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = isTown ? engine.state.townLevel.map : engine.state.dungeon.map;
    const { player, enemies } = engine.state;
    const scaleX = canvas.width / map.width;
    const scaleY = canvas.height / map.height;

    // Bake static terrain layer once per map instance to avoid 9,216 fillRect calls per tick!
    if (!staticLayerRef.current || staticLayerRef.current.map !== map) {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.fillStyle = '#090d16';
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
                octx.fillStyle = isInterior ? '#5c4330' : isRoad ? '#736c62' : '#255c34';
              } else {
                octx.fillStyle = '#1e293b';
              }
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Wall && isTown) {
              const isTree = (flags & TOWN_TILE_FLAG_TREE) !== 0;
              octx.fillStyle = isTree ? '#164526' : '#857768';
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Water) {
              octx.fillStyle = '#0ea5e9';
              octx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
            } else if (type === TileType.Exit) {
              octx.fillStyle = '#a855f7';
              octx.fillRect(x * scaleX, y * scaleY, scaleX + 1.5, scaleY + 1.5);
            } else if (type === TileType.Chest) {
              octx.fillStyle = '#f59e0b';
              octx.fillRect(x * scaleX, y * scaleY, scaleX + 1, scaleY + 1);
            }
          }
        }

        if (isTown) {
          octx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
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

    // 1. Blit pre-baked static terrain in a single call
    ctx.drawImage(staticLayerRef.current.canvas, 0, 0);

    // 2. Dynamic overlays: active building highlight & NPC / Enemy markers
    if (isTown) {
      if (currentBuilding) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          currentBuilding.x * scaleX,
          currentBuilding.y * scaleY,
          currentBuilding.w * scaleX,
          currentBuilding.h * scaleY
        );
        if (currentBuilding.wing) {
          ctx.strokeRect(
            currentBuilding.wing.x * scaleX,
            currentBuilding.wing.y * scaleY,
            currentBuilding.wing.w * scaleX,
            currentBuilding.wing.h * scaleY
          );
        }
      }

      // Draw NPCs batched by role color
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      for (const npc of engine.state.townLevel.npcs) {
        if (npc.role === 'villager') continue;
        const nt = map.worldToTile(npc.x, npc.y);
        const cx = (nt.x + 0.5) * scaleX;
        const cy = (nt.y + 0.5) * scaleY;
        ctx.moveTo(cx + 2.5, cy);
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (const npc of engine.state.townLevel.npcs) {
        if (npc.role !== 'villager') continue;
        const nt = map.worldToTile(npc.x, npc.y);
        const cx = (nt.x + 0.5) * scaleX;
        const cy = (nt.y + 0.5) * scaleY;
        ctx.moveTo(cx + 1.9, cy);
        ctx.arc(cx, cy, 1.9, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      // In dungeon: draw enemies as red dots in a single batched path
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      for (const enemy of enemies) {
        const et = map.worldToTile(enemy.x, enemy.y);
        const cx = (et.x + 0.5) * scaleX;
        const cy = (et.y + 0.5) * scaleY;
        ctx.moveTo(cx + 2, cy);
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Draw player as bright cyan dot with subtle halo
    const pt = map.worldToTile(player.x, player.y);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
    ctx.beginPath();
    ctx.arc((pt.x + 0.5) * scaleX, (pt.y + 0.5) * scaleY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc((pt.x + 0.5) * scaleX, (pt.y + 0.5) * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Calculate sun/moon marker position along the 24h cycle bar (0% at 00:00, 50% at 12:00, 100% at 24:00)
  const dayProgressPercent = Math.min(100, Math.max(0, (daylight.timeHours / 24) * 100));

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 select-none">
      {/* Overworld Daylight Clock & Phase Widget (Directly Above Minimap) */}
      {isTown && (
        <div
          id="daylight-clock-widget"
          className={`w-[164px] bg-slate-950/95 border border-slate-800/90 rounded-2xl px-3 py-2 shadow-2xl ${phaseVisuals.glowColor} transition-colors duration-500`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <PhaseIcon className={`w-4 h-4 ${phaseVisuals.iconColor} shrink-0`} />
              <span className="font-mono text-xs font-bold tracking-tight text-slate-100">
                {daylight.formattedTime}
              </span>
            </div>
            <span
              className={`text-[10px] font-cinzel font-bold px-1.5 py-0.5 rounded-md border ${phaseVisuals.badgeBg}`}
            >
              {daylight.phase}
            </span>
          </div>

          {/* 24-Hour Horizon Progress Bar with Morning (06:00) & Night (20:30) Markers */}
          <div className="mt-1.5">
            <div className="relative h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800/80">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${phaseVisuals.barGradient} transition-all duration-300`}
                style={{ width: `${dayProgressPercent}%` }}
              />
              {/* Dawn/Morning threshold tick (06:00 = 25%) */}
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-amber-300/60"
                style={{ left: '25%' }}
                title="Morning (06:00 AM)"
              />
              {/* Night threshold tick (20:30 = 85.4%) */}
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-indigo-300/60"
                style={{ left: '85.4%' }}
                title="Nightfall (08:30 PM)"
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>{nextTransitionLabel}</span>
              <span className="text-slate-500">24h / 4m</span>
            </div>
          </div>
        </div>
      )}

      {/* Minimap Card */}
      <div className="w-[164px] bg-slate-950/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{isTown ? 'Oakridge Village' : 'Chamber Radar'}</span>
          </div>
          <span className="font-mono text-[10px] text-amber-400/90 shrink-0">
            {isTown ? 'Town-1' : `F${engine.state.currentFloor}`}
          </span>
        </div>

        {/* Active Building Interior Indicator when Player steps inside a House */}
        {isTown && currentBuilding && (
          <div className="flex items-center gap-1.5 bg-amber-950/50 border border-amber-700/50 rounded-lg px-2 py-1 mb-1.5 text-[10px] text-amber-200 font-medium truncate">
            <Home className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{currentBuilding.name}</span>
          </div>
        )}

        <canvas
          id="minimap-canvas"
          ref={canvasRef}
          width={142}
          height={142}
          className="w-full h-auto rounded-lg border border-slate-800/90 block"
        />
      </div>
    </div>
  );
};
