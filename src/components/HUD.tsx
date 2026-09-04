import React from 'react';
import { GameEngine } from '../engine/gameEngine';
import { StatType } from '../engine/types';
import { PLAYER_ABILITIES } from '../engine/abilities';
import {
  Sword,
  Flame,
  Snowflake,
  Zap,
  Backpack,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../engine/audio';

interface HUDProps {
  engine: GameEngine;
  onOpenInventory: () => void;
  onOpenCharacterSheet: () => void;
  onResetGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenInventory,
  onOpenCharacterSheet,
  onResetGame,
  isMuted,
  onToggleMute,
}) => {
  const { playerStats, currentFloor, abilityCooldowns, unallocatedStatPoints, floorCleared } =
    engine.state;
  const maxHp = playerStats.calculated[StatType.MaxHealth] || 1;
  const maxMp = playerStats.calculated[StatType.MaxMana] || 1;

  const hpPct = Math.max(0, Math.min(100, (playerStats.health / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (playerStats.mana / maxMp) * 100));
  const xpPct = Math.max(0, Math.min(100, (playerStats.xp / playerStats.xpToNextLevel) * 100));

  const getAbilityIcon = (id: number) => {
    switch (id) {
      case 1:
        return <Sword className="w-6 h-6 text-amber-300" />;
      case 2:
        return <Flame className="w-6 h-6 text-orange-400" />;
      case 3:
        return <Snowflake className="w-6 h-6 text-sky-400" />;
      case 4:
        return <Zap className="w-6 h-6 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 z-10 select-none">
      {/* Top Header: Floor, Level, Gold & Quick Menus */}
      <div className="flex items-start justify-between">
        {/* Floor & Objective */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur border border-slate-800 rounded-xl px-4 py-3 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="font-cinzel font-bold text-amber-400 text-lg">
              Floor {currentFloor}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              Depth {currentFloor * 100}m
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {floorCleared ? (
              <span className="text-emerald-400 font-medium animate-pulse">
                ✓ Floor Boss Slain! Portal Active!
              </span>
            ) : (
              'Defeat the chamber Overseer to open the portal.'
            )}
          </p>
        </div>

        {/* Action buttons (Inventory, Character Sheet, Audio, Reset) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            id="char-sheet-btn"
            onClick={onOpenCharacterSheet}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/85 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow transition active:scale-95"
            title="Character Sheet (C)"
          >
            <User className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold">Hero</span>
            {unallocatedStatPoints > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center animate-bounce">
                {unallocatedStatPoints}
              </span>
            )}
          </button>

          <button
            id="inventory-btn"
            onClick={onOpenInventory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/85 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 shadow transition active:scale-95"
            title="Inventory & Gear (I)"
          >
            <Backpack className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold">Inventory</span>
          </button>

          <button
            id="mute-btn"
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900/85 hover:bg-slate-800/90 text-slate-300 border border-slate-700/80 shadow transition"
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            id="reset-btn"
            onClick={onResetGame}
            className="p-2 rounded-lg bg-slate-900/85 hover:bg-slate-800/90 text-slate-300 border border-slate-700/80 shadow transition"
            title="Restart Run"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Bottom Bar: Health, Mana, XP, Skills */}
      <div className="flex flex-col items-center gap-2">
        {/* Experience Progression Bar */}
        <div className="w-full max-w-xl bg-slate-950/80 backdrop-blur border border-slate-800/80 rounded-full h-3 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="text-[11px] text-amber-400/90 font-mono">
          Level {playerStats.level} Hero • {playerStats.xp} / {playerStats.xpToNextLevel} XP •{' '}
          {playerStats.gold} Gold
        </div>

        {/* Central HUD Panel */}
        <div className="pointer-events-auto flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 px-6 py-3 rounded-2xl shadow-2xl">
          {/* Health Bar / Stat */}
          <div className="w-32 flex flex-col items-end">
            <div className="flex justify-between w-full text-xs font-semibold mb-1">
              <span className="text-rose-400">Health</span>
              <span className="font-mono text-slate-200">
                {Math.round(playerStats.health)} / {Math.round(maxHp)}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-md h-4 overflow-hidden border border-rose-950">
              <div
                className="h-full bg-gradient-to-r from-rose-700 to-rose-500 transition-all duration-200"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Skill Bar (4 Abilities) */}
          <div className="flex items-center gap-2">
            {PLAYER_ABILITIES.map((ability) => {
              const cd = abilityCooldowns[ability.id] || 0;
              const hasMana = playerStats.mana >= ability.manaCost;
              const isOnCd = cd > 0;

              return (
                <button
                  key={ability.id}
                  id={`skill-btn-${ability.id}`}
                  onClick={() => engine.triggerAbility(ability.id)}
                  disabled={isOnCd || !hasMana}
                  className={`relative w-14 h-14 rounded-xl border flex flex-col items-center justify-center transition-transform active:scale-95 ${
                    isOnCd
                      ? 'bg-slate-950/80 border-slate-800 opacity-60'
                      : !hasMana
                      ? 'bg-slate-950/80 border-rose-900/70'
                      : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 shadow-md hover:border-slate-500'
                  }`}
                  title={`${ability.name} (${ability.key})\n${ability.description}\nMana: ${ability.manaCost}`}
                >
                  {getAbilityIcon(ability.id)}

                  {/* Keybinding badge */}
                  <span className="absolute top-1 left-1.5 text-[9px] font-mono px-1 rounded bg-slate-950/80 text-slate-300">
                    {ability.key}
                  </span>

                  {/* Mana badge */}
                  {ability.manaCost > 0 && (
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono text-sky-300">
                      {ability.manaCost}m
                    </span>
                  )}

                  {/* Cooldown overlay */}
                  {isOnCd && (
                    <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center text-sm font-bold font-mono text-amber-400">
                      {cd.toFixed(1)}s
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mana Bar / Stat */}
          <div className="w-32 flex flex-col items-start">
            <div className="flex justify-between w-full text-xs font-semibold mb-1">
              <span className="text-sky-400">Mana</span>
              <span className="font-mono text-slate-200">
                {Math.round(playerStats.mana)} / {Math.round(maxMp)}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-md h-4 overflow-hidden border border-sky-950">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-200"
                style={{ width: `${mpPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
