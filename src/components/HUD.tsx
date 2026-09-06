import React from 'react';
import { GameEngine } from '../engine/gameEngine';
import { StatType } from '../engine/types';
import { CLASS_DEFINITIONS } from '../engine/classes';
import {
  Sword,
  Flame,
  Snowflake,
  Zap,
  Backpack,
  User,
  Volume2,
  VolumeX,
  Menu,
  Crosshair,
  Split,
  CloudRain,
  Wind,
  Sparkles,
  Ghost,
  Skull,
  Hammer,
  Shield,
  RotateCw,
  MessageSquare,
  DoorOpen,
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onOpenInventory: () => void;
  onOpenCharacterSheet: () => void;
  onOpenMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onInteract?: () => void;
  onInteractPortal?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenInventory,
  onOpenCharacterSheet,
  onOpenMenu,
  isMuted,
  onToggleMute,
  onInteract,
  onInteractPortal,
}) => {
  const {
    playerStats,
    currentFloor,
    currentZone,
    activeNPC,
    selectedClass,
    abilityCooldowns,
    unallocatedStatPoints,
    floorCleared,
  } = engine.state;
  const maxHp = playerStats.calculated[StatType.MaxHealth] || 1;
  const maxMp = playerStats.calculated[StatType.MaxMana] || 1;

  const hpPct = Math.max(0, Math.min(100, (playerStats.health / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (playerStats.mana / maxMp) * 100));
  const xpPct = Math.max(0, Math.min(100, (playerStats.xp / playerStats.xpToNextLevel) * 100));

  const isTown = currentZone === 'town';
  const classDef =
    CLASS_DEFINITIONS[selectedClass || 'swordsman'] || CLASS_DEFINITIONS.swordsman;
  const activeAbilities = classDef.abilities;

  // Check proximity to town portal or dungeon exit
  const dungeonExitWorldPos = engine.state.dungeon?.exitTile
    ? engine.state.dungeon.map.tileToWorldCenter(
        engine.state.dungeon.exitTile.x,
        engine.state.dungeon.exitTile.y
      )
    : { x: 0, y: 0 };

  const isNearPortal = isTown
    ? Math.hypot(
        engine.state.player.x - (engine.state.townLevel.dungeonPortalPos?.x || 0),
        engine.state.player.y - (engine.state.townLevel.dungeonPortalPos?.y || 0)
      ) <= 90
    : floorCleared &&
      Math.hypot(
        engine.state.player.x - dungeonExitWorldPos.x,
        engine.state.player.y - dungeonExitWorldPos.y
      ) <= 90;

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="w-6 h-6 text-amber-300" />;
      case 'Hammer':
        return <Hammer className="w-6 h-6 text-orange-400" />;
      case 'Shield':
        return <Shield className="w-6 h-6 text-yellow-300" />;
      case 'RotateCw':
        return <RotateCw className="w-6 h-6 text-emerald-300" />;
      case 'Crosshair':
        return <Crosshair className="w-6 h-6 text-emerald-400" />;
      case 'Split':
        return <Split className="w-6 h-6 text-teal-300" />;
      case 'CloudRain':
        return <CloudRain className="w-6 h-6 text-sky-400" />;
      case 'Wind':
        return <Wind className="w-6 h-6 text-indigo-300" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-cyan-300" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-orange-500" />;
      case 'Snowflake':
        return <Snowflake className="w-6 h-6 text-sky-400" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-purple-400" />;
      case 'Ghost':
        return <Ghost className="w-6 h-6 text-purple-400" />;
      case 'Skull':
        return <Skull className="w-6 h-6 text-lime-400" />;
      default:
        return <Sword className="w-6 h-6 text-amber-300" />;
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
              {isTown ? 'Town-1: Sanctuary' : `Floor ${currentFloor}`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {isTown ? 'Safe Haven' : `Depth ${currentFloor * 100}m`}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {isTown ? (
              <span className="text-amber-300">
                Rest, stash loot with Brom, visit Garrick's shop, forge gear with Torvald, or enter the Portal.
              </span>
            ) : floorCleared ? (
              <span className="text-emerald-400 font-medium animate-pulse">
                ✓ Chamber Guardian Slain! Portal to Next Depth Active!
              </span>
            ) : (
              'Defeat the chamber Overseer to break the seal on the portal.'
            )}
          </p>
        </div>

        {/* Action buttons (Hero, Inventory, Audio, Menu) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-2xl shadow-xl">
          <button
            id="char-sheet-btn"
            onClick={onOpenCharacterSheet}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-semibold transition active:scale-95"
            title="Character Sheet (C)"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Hero</span>
            {unallocatedStatPoints > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center animate-bounce">
                {unallocatedStatPoints}
              </span>
            )}
          </button>

          <button
            id="inventory-btn"
            onClick={onOpenInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-semibold transition active:scale-95"
            title="Inventory & Gear (I)"
          >
            <Backpack className="w-3.5 h-3.5 text-amber-400" />
            <span>Inventory</span>
          </button>

          <button
            id="mute-btn"
            onClick={onToggleMute}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition"
            title={isMuted ? 'Unmute SFX' : 'Mute SFX (M)'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          <button
            id="menu-btn"
            onClick={onOpenMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold font-cinzel transition active:scale-95"
            title="Menu / Pause (Esc)"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu</span>
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
          {engine.state.playerName || 'Hero'} • Level {playerStats.level} {classDef.name} • {playerStats.xp} / {playerStats.xpToNextLevel} XP •{' '}
          {playerStats.gold} Gold
        </div>

        {/* Active Status Effects Bar */}
        {engine.state.player.statusEffects && engine.state.player.statusEffects.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-2 mb-0.5">
            {engine.state.player.statusEffects.map((eff) => (
              <div
                key={eff.id}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border text-xs shadow-md"
                style={{ borderColor: eff.color }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: eff.color }} />
                <span className="font-semibold text-slate-200 text-[11px]">{eff.name}</span>
                <span className="font-mono text-slate-400 text-[10px]">{eff.durationLeft.toFixed(1)}s</span>
              </div>
            ))}
          </div>
        )}

        {/* On-Screen Context Interaction Prompts */}
        {activeNPC && (
          <button
            id="npc-interaction-prompt"
            onClick={onInteract}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-cinzel font-bold text-xs shadow-xl border border-amber-300 animate-bounce active:scale-95 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>[E] Talk to {activeNPC.name} ({activeNPC.title})</span>
          </button>
        )}

        {!activeNPC && isNearPortal && (
          <button
            id="portal-interaction-prompt"
            onClick={onInteractPortal}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-cinzel font-bold text-xs shadow-xl border border-purple-400 animate-pulse active:scale-95 transition"
          >
            <DoorOpen className="w-4 h-4" />
            <span>[E] {isTown ? 'Enter Dungeon Gateway' : 'Access Floor Portal'}</span>
          </button>
        )}

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

          {/* Skill Bar (4 Class-Specific Abilities) */}
          <div className="flex items-center gap-2">
            {activeAbilities.map((ability) => {
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
                  {renderIcon(ability.icon)}

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
