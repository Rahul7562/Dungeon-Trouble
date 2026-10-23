import React from 'react';
import { GameEngine } from '../engine/gameEngine';
import { StatType } from '../engine/types';
import { CLASS_DEFINITIONS } from '../engine/classes';
import {
  Volume2,
  VolumeX,
  MessageSquare,
  DoorOpen,
  Heart,
  Star,
  Shield,
  Coins,
} from 'lucide-react';
import { ClassPortraitArt, ActionSlotArtwork, GargoyleStatuette } from './RpgArtAssets';

interface HUDProps {
  engine: GameEngine;
  onOpenInventory: () => void;
  onOpenCharacterSheet: () => void;
  onOpenMenu: () => void;
  onToggleGuide?: () => void;
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
  onToggleGuide,
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
  const armorVal = Math.round(playerStats.calculated[StatType.Armor] || 0);

  const hpPct = Math.max(0, Math.min(100, (playerStats.health / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (playerStats.mana / maxMp) * 100));
  const xpPct = Math.max(0, Math.min(100, (playerStats.xp / playerStats.xpToNextLevel) * 100));

  const isTown = currentZone === 'town';
  const heroClass = selectedClass || 'swordsman';
  const classDef = CLASS_DEFINITIONS[heroClass] || CLASS_DEFINITIONS.swordsman;
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

  const getAbilityArtKind = (iconName?: string, idx = 0) => {
    switch (iconName) {
      case 'Sword':
      case 'Hammer':
        return 'slash' as const;
      case 'Shield':
        return 'shield' as const;
      case 'RotateCw':
      case 'Snowflake':
        return 'whirlwind' as const;
      case 'Flame':
        return 'fire' as const;
      case 'Sparkles':
      case 'Zap':
      case 'Wind':
        return 'arcane' as const;
      case 'Crosshair':
      case 'Split':
      case 'CloudRain':
        return 'arrow' as const;
      case 'Skull':
      case 'Ghost':
        return 'skull' as const;
      default:
        return idx === 0
          ? ('slash' as const)
          : idx === 1
          ? ('shield' as const)
          : idx === 2
          ? ('whirlwind' as const)
          : ('fire' as const);
    }
  };

  // Count available quick potions in inventory
  const healthPotionCount = engine.state.inventory.reduce(
    (sum, item) =>
      item && (item.itemDefId === 10 || item.itemDefId === 26 || item.itemDefId === 14)
        ? sum + item.count
        : sum,
    0
  );
  const manaPotionCount = engine.state.inventory.reduce(
    (sum, item) => (item && (item.itemDefId === 11 || item.itemDefId === 27) ? sum + item.count : sum),
    0
  );

  const themeName = engine.state.dungeon?.theme?.name || 'Forgotten Catacombs';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 z-10 select-none">
      {/* =====================================================================
          TOP ROW: Left Hero Unit Frame & Center Hanging Chained Zone Crest
         ===================================================================== */}
      <div className="flex items-start justify-between pr-44">
        {/* 1. TOP-LEFT ORNATE HERO UNIT FRAME (Matching image_5f5e217c.png) */}
        <div className="pointer-events-auto relative flex items-center">
          {/* Gilded Portrait Shield Frame */}
          <button
            onClick={onOpenCharacterSheet}
            title={`${engine.state.playerName || 'Valerius'} • Click to open Hero Sheet (C)`}
            className="relative z-20 w-[76px] h-[82px] rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.9)] group cursor-pointer transition-transform active:scale-95"
          >
            <div className="w-full h-full rounded-[13px] overflow-hidden bg-stone-950 border-2 border-stone-900 relative">
              <ClassPortraitArt heroClass={heroClass} size={72} className="w-full h-full object-cover" />
              <div className="absolute inset-0 ring-1 ring-inset ring-amber-200/30 rounded-[12px]" />
            </div>

            {/* Top Crest Crown Spike */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gradient-to-br from-yellow-200 to-amber-600 border border-stone-950 shadow" />

            {/* Bottom 3 Mini Status Medallions (Vitality Heart, Unallocated Star, Armor Shield) */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-stone-900 border border-amber-400 flex items-center justify-center shadow">
                <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
              </span>
              <span
                className={`w-6 h-6 rounded-full bg-stone-900 border-2 border-amber-400 flex items-center justify-center shadow ${
                  unallocatedStatPoints > 0 ? 'animate-bounce bg-amber-950' : ''
                }`}
              >
                {unallocatedStatPoints > 0 ? (
                  <span className="font-mono font-extrabold text-[10px] text-yellow-300">
                    +{unallocatedStatPoints}
                  </span>
                ) : (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                )}
              </span>
              <span
                className="w-5 h-5 rounded-full bg-stone-900 border border-amber-400 flex items-center justify-center shadow"
                title={`Armor: ${armorVal}`}
              >
                <Shield className="w-2.5 h-2.5 text-amber-300" />
              </span>
            </div>
          </button>

          {/* Horizontal Chiseled Metallic HP / MP / XP Bar Housing */}
          <div className="-ml-3 pl-5 pr-11 py-2 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-y-2 border-r-2 border-amber-500/85 rounded-r-2xl shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex flex-col gap-1.5 min-w-[205px] sm:min-w-[235px]">
            {/* HP Bar */}
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-black text-[10px] text-amber-200 w-5 tracking-wider">
                HP
              </span>
              <div className="relative flex-1 h-3.5 bg-stone-950 rounded-sm overflow-hidden border border-stone-600 shadow-inner">
                <div
                  className="h-full bg-gradient-to-b from-rose-400 via-red-600 to-rose-900 transition-all duration-200"
                  style={{ width: `${hpPct}%` }}
                />
                <div className="absolute inset-x-0 top-0 h-[35%] bg-white/25 pointer-events-none" />
                <span className="absolute inset-0 flex items-center justify-end pr-1.5 font-mono text-[9px] font-bold text-white/95 drop-shadow">
                  {Math.round(playerStats.health)}/{Math.round(maxHp)}
                </span>
              </div>
            </div>

            {/* MP Bar */}
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-black text-[10px] text-amber-200 w-5 tracking-wider">
                MP
              </span>
              <div className="relative flex-1 h-3 bg-stone-950 rounded-sm overflow-hidden border border-stone-600 shadow-inner">
                <div
                  className="h-full bg-gradient-to-b from-cyan-300 via-sky-500 to-blue-900 transition-all duration-200"
                  style={{ width: `${mpPct}%` }}
                />
                <div className="absolute inset-x-0 top-0 h-[35%] bg-white/25 pointer-events-none" />
                <span className="absolute inset-0 flex items-center justify-end pr-1.5 font-mono text-[8.5px] font-bold text-white/90 drop-shadow">
                  {Math.round(playerStats.mana)}/{Math.round(maxMp)}
                </span>
              </div>
            </div>

            {/* XP Bar */}
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-black text-[10px] text-amber-200 w-5 tracking-wider">
                XP
              </span>
              <div className="relative flex-1 h-2 bg-stone-950 rounded-sm overflow-hidden border border-stone-700 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right-End Circular Gold Level Medallion ("LV. 24" in image_5f5e217c.png) */}
          <div className="-ml-7 z-20 w-14 h-14 rounded-full bg-gradient-to-b from-yellow-200 via-amber-500 to-amber-800 p-[2.5px] shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-stone-800 to-stone-950 border border-amber-300/60 flex flex-col items-center justify-center leading-none">
              <span className="font-cinzel font-bold text-[9px] text-amber-300 tracking-wider">
                LV.
              </span>
              <span className="font-cinzel font-black text-base text-yellow-300 drop-shadow">
                {playerStats.level}
              </span>
            </div>
          </div>
        </div>

        {/* 2. TOP-CENTER HANGING CHAINED CREST BANNER (Matching image_5f5e217c.png) */}
        <div className="hidden lg:flex flex-col items-center -mt-3 pointer-events-auto">
          {/* Two Iron Suspension Chains */}
          <div className="flex justify-between w-48 px-6">
            <div className="w-1.5 h-4 bg-gradient-to-b from-stone-400 to-stone-700 border-x border-stone-950" />
            <div className="w-1.5 h-4 bg-gradient-to-b from-stone-400 to-stone-700 border-x border-stone-950" />
          </div>

          {/* Ornate Forged-Iron & Gold-Filigree Hanging Crest */}
          <div className="relative px-7 py-2 rounded-b-2xl rounded-t-md bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-2 border-amber-500/90 shadow-[0_10px_28px_rgba(0,0,0,0.9)] text-center">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-amber-400 border border-stone-950" />
            <div className="font-cinzel font-black text-lg tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 leading-tight drop-shadow">
              DUNGEON TROUBLE
            </div>
            <div className="text-[10px] font-cinzel font-bold text-amber-200/90 tracking-wider uppercase mt-0.5">
              {isTown ? 'Town-1: Oakridge Sanctuary' : `Floor ${currentFloor}: ${themeName}`}
            </div>
            <div className="text-[9.5px] text-stone-300 mt-0.5">
              {isTown ? (
                <span className="text-amber-300/90">
                  Safe Haven • Visit Merchants, Forge Gear, or Enter Portal
                </span>
              ) : floorCleared ? (
                <span className="text-emerald-400 font-semibold animate-pulse">
                  ✓ Overseer Slain — Floor Portal Unlocked!
                </span>
              ) : (
                <span>Slay the Chamber Overseer to unseal the depth portal</span>
              )}
            </div>
          </div>
        </div>

        <div className="w-4" />
      </div>

      {/* =====================================================================
          BOTTOM ROW: Gargoyle Action Bar (Center) & 2x2 Medallion Cluster (Right)
         ===================================================================== */}
      <div className="relative flex flex-col items-center justify-end w-full">
        {/* Context Interaction Prompts (NPC Talk / Portal Enter) */}
        {activeNPC && (
          <button
            id="npc-interaction-prompt"
            onClick={onInteract}
            className="pointer-events-auto mb-2.5 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-cinzel font-extrabold text-xs shadow-2xl border-2 border-yellow-200 animate-bounce active:scale-95 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              [E] Talk to {activeNPC.name} ({activeNPC.title})
            </span>
          </button>
        )}

        {!activeNPC && isNearPortal && (
          <button
            id="portal-interaction-prompt"
            onClick={onInteractPortal}
            className="pointer-events-auto mb-2.5 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-b from-purple-500 to-indigo-700 hover:from-purple-400 hover:to-indigo-600 text-white font-cinzel font-extrabold text-xs shadow-2xl border-2 border-purple-300 animate-pulse active:scale-95 transition"
          >
            <DoorOpen className="w-4 h-4" />
            <span>[E] {isTown ? 'Enter Dungeon Gateway' : 'Access Floor Portal'}</span>
          </button>
        )}

        {/* Active Buff / Status Pills + Secondary Mini Consumable Row directly above Gargoyle Bar */}
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-[620px] px-12 mb-1">
          {/* Left Mini-Slots: Equipped Stance & Active Status Buffs */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded bg-stone-900/95 border border-amber-500/70 flex items-center justify-center shadow"
              title={`Active Class: ${classDef.name}`}
            >
              <ActionSlotArtwork
                kind={
                  heroClass === 'archer'
                    ? 'arrow'
                    : heroClass === 'mage'
                    ? 'arcane'
                    : heroClass === 'necromancer'
                    ? 'skull'
                    : 'slash'
                }
                size={20}
              />
            </div>
            {engine.state.player.statusEffects &&
              engine.state.player.statusEffects.map((eff) => (
                <div
                  key={eff.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-900/95 border text-[10px] shadow"
                  style={{ borderColor: eff.color }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: eff.color }}
                  />
                  <span className="font-semibold text-amber-100">{eff.name}</span>
                  <span className="font-mono text-amber-300/90">{eff.durationLeft.toFixed(1)}s</span>
                </div>
              ))}
          </div>

          {/* Right Mini-Slots: Gold Counter & Quick Potion Mini-Boxes (Matching image_5f5e217c.png) */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 px-2.5 h-7 rounded bg-stone-900/95 border border-amber-500/70 text-[11px] font-mono font-bold text-amber-300 shadow"
              title="Gold Coins"
            >
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span>{playerStats.gold}</span>
            </div>

            <button
              id="quick-hp-potion-btn"
              onClick={() => engine.useQuickPotion('health')}
              disabled={healthPotionCount <= 0}
              title="Drink Health Elixir (Hotkey: H)"
              className={`relative w-7 h-7 rounded bg-stone-900/95 border flex items-center justify-center transition active:scale-95 ${
                healthPotionCount > 0
                  ? 'border-rose-500/80 hover:border-rose-300 cursor-pointer'
                  : 'border-stone-800 opacity-45'
              }`}
            >
              <ActionSlotArtwork kind="hp_potion" size={20} />
              <span className="absolute -bottom-0.5 right-0.5 font-mono text-[8px] font-bold text-white drop-shadow">
                {healthPotionCount}
              </span>
            </button>

            <button
              id="quick-mp-potion-btn"
              onClick={() => engine.useQuickPotion('mana')}
              disabled={manaPotionCount <= 0}
              title="Drink Mana Flask (Hotkey: M)"
              className={`relative w-7 h-7 rounded bg-stone-900/95 border flex items-center justify-center transition active:scale-95 ${
                manaPotionCount > 0
                  ? 'border-sky-500/80 hover:border-sky-300 cursor-pointer'
                  : 'border-stone-800 opacity-45'
              }`}
            >
              <ActionSlotArtwork kind="mp_potion" size={20} />
              <span className="absolute -bottom-0.5 right-0.5 font-mono text-[8px] font-bold text-white drop-shadow">
                {manaPotionCount}
              </span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            GARGOYLE-FLANKED 8-SLOT ACTION BAR (Matching image_5f5e217c.png)
           =================================================================== */}
        <div className="pointer-events-auto flex items-end justify-center">
          {/* Left Mini Utility Buttons (Audio Mute & Controls Guide) */}
          <div className="hidden sm:flex flex-col gap-1.5 mr-1.5 mb-2">
            <button
              id="mute-btn"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
              className="w-7 h-7 rounded bg-stone-900/95 hover:bg-stone-800 border border-amber-500/60 flex items-center justify-center text-amber-300 shadow transition"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              )}
            </button>
            {onToggleGuide && (
              <button
                onClick={onToggleGuide}
                title="Toggle Controls Guide (H)"
                className="w-7 h-7 rounded bg-stone-900/95 hover:bg-stone-800 border border-amber-500/60 flex items-center justify-center font-cinzel font-bold text-[10px] text-amber-300 shadow transition"
              >
                K
              </button>
            )}
          </div>

          {/* Left Stone Gargoyle Guardian */}
          <div className="hidden sm:block -mr-3 z-20 pointer-events-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.95)]">
            <GargoyleStatuette />
          </div>

          {/* Central Chiseled Stone & Gold-Filigree Skill Bar Frame */}
          <div className="relative bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-2 border-amber-500/90 rounded-xl px-3.5 pt-2.5 pb-2 shadow-[0_12px_36px_rgba(0,0,0,0.95)]">
            {/* Ornate Center Gold Filigree Diamond Crest on Top Edge */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border-2 border-stone-950 shadow z-20" />

            {/* Action Slots Row (Slots 1-4: Class Skills, 5: HP Elixir, 6: Mana Flask, 7: Portal/Interact, 8: Hero Tome) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {activeAbilities.map((ability, idx) => {
                const cd = abilityCooldowns[ability.id] || 0;
                const hasMana = playerStats.mana >= ability.manaCost;
                const isOnCd = cd > 0;
                const slotNum = idx + 1;

                return (
                  <div key={ability.id} className="flex flex-col items-center">
                    <span className="font-cinzel font-bold text-[9px] text-amber-300/90 mb-0.5">
                      {slotNum}
                    </span>
                    <button
                      id={`skill-btn-${ability.id}`}
                      onClick={() => engine.triggerAbility(ability.id)}
                      disabled={isOnCd || !hasMana}
                      title={`${ability.name} (${ability.key})\n${ability.description}\nMana: ${ability.manaCost}`}
                      className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-md border-2 flex items-center justify-center transition-transform active:scale-95 overflow-hidden ${
                        isOnCd
                          ? 'bg-stone-950 border-stone-700 opacity-65'
                          : !hasMana
                          ? 'bg-stone-950 border-rose-800/80'
                          : 'bg-gradient-to-b from-stone-800 to-stone-950 hover:from-stone-700 hover:to-stone-900 border-amber-500/85 hover:border-yellow-300 shadow-inner cursor-pointer'
                      }`}
                    >
                      <ActionSlotArtwork kind={getAbilityArtKind(ability.icon, idx)} size={38} />

                      {/* Keybinding badge */}
                      <span className="absolute top-0.5 left-1 font-mono text-[8.5px] font-bold text-amber-200 drop-shadow">
                        {ability.key}
                      </span>

                      {/* Mana cost badge */}
                      {ability.manaCost > 0 && (
                        <span className="absolute bottom-0.5 right-1 font-mono text-[8.5px] font-bold text-sky-300 drop-shadow">
                          {ability.manaCost}m
                        </span>
                      )}

                      {/* Cooldown overlay */}
                      {isOnCd && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center font-mono font-extrabold text-xs text-amber-300">
                          {cd.toFixed(1)}s
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Slot 5: Health Elixir */}
              <div className="flex flex-col items-center">
                <span className="font-cinzel font-bold text-[9px] text-amber-300/90 mb-0.5">5</span>
                <button
                  onClick={() => engine.useQuickPotion('health')}
                  disabled={healthPotionCount <= 0}
                  title="Drink Health Elixir (Hotkey: H)"
                  className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-md border-2 flex items-center justify-center transition active:scale-95 ${
                    healthPotionCount > 0
                      ? 'bg-gradient-to-b from-rose-950/80 to-stone-950 border-amber-500/80 hover:border-rose-400 cursor-pointer'
                      : 'bg-stone-950 border-stone-800 opacity-50'
                  }`}
                >
                  <ActionSlotArtwork kind="hp_potion" size={34} />
                  <span className="absolute top-0.5 left-1 font-mono text-[8.5px] font-bold text-rose-200">
                    H
                  </span>
                  <span className="absolute bottom-0.5 right-1 font-mono text-[9px] font-bold text-amber-200">
                    x{healthPotionCount}
                  </span>
                </button>
              </div>

              {/* Slot 6: Mana Flask */}
              <div className="flex flex-col items-center">
                <span className="font-cinzel font-bold text-[9px] text-amber-300/90 mb-0.5">6</span>
                <button
                  onClick={() => engine.useQuickPotion('mana')}
                  disabled={manaPotionCount <= 0}
                  title="Drink Mana Flask (Hotkey: M)"
                  className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-md border-2 flex items-center justify-center transition active:scale-95 ${
                    manaPotionCount > 0
                      ? 'bg-gradient-to-b from-sky-950/80 to-stone-950 border-amber-500/80 hover:border-sky-400 cursor-pointer'
                      : 'bg-stone-950 border-stone-800 opacity-50'
                  }`}
                >
                  <ActionSlotArtwork kind="mp_potion" size={34} />
                  <span className="absolute top-0.5 left-1 font-mono text-[8.5px] font-bold text-sky-200">
                    M
                  </span>
                  <span className="absolute bottom-0.5 right-1 font-mono text-[9px] font-bold text-amber-200">
                    x{manaPotionCount}
                  </span>
                </button>
              </div>

              {/* Slot 7: Town / Dungeon Portal Scroll */}
              <div className="hidden md:flex flex-col items-center">
                <span className="font-cinzel font-bold text-[9px] text-amber-300/90 mb-0.5">7</span>
                <button
                  onClick={() => (onInteractPortal ? onInteractPortal() : engine.interact())}
                  title="Sanctuary Waypoint / Dungeon Gateway"
                  className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-md border-2 bg-gradient-to-b from-purple-950/70 to-stone-950 border-amber-500/80 hover:border-purple-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <ActionSlotArtwork kind="town_scroll" size={34} />
                  <span className="absolute bottom-0.5 right-1 font-mono text-[8px] font-bold text-purple-200">
                    F{currentFloor}
                  </span>
                </button>
              </div>

              {/* Slot 8: Inventory Bag Quick Slot */}
              <div className="hidden md:flex flex-col items-center">
                <span className="font-cinzel font-bold text-[9px] text-amber-300/90 mb-0.5">8</span>
                <button
                  onClick={onOpenInventory}
                  title="Open Inventory & Equipment (I / B)"
                  className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-md border-2 bg-gradient-to-b from-stone-800 to-stone-950 border-amber-500/80 hover:border-yellow-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <ActionSlotArtwork kind="backpack" size={32} />
                  <span className="absolute top-0.5 left-1 font-mono text-[8.5px] font-bold text-amber-200">
                    I
                  </span>
                </button>
              </div>
            </div>

            {/* Segmented Golden Experience Bar Along Bottom Edge of Action Frame (Matching image_5f5e217c.png) */}
            <div className="mt-2 relative h-2.5 w-full bg-stone-950 rounded-full overflow-hidden border border-amber-600/70 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 transition-all duration-300"
                style={{ width: `${xpPct}%` }}
              />
              {/* 10 Segment Tick Dividers */}
              <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="border-r border-stone-950/80 h-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Stone Gargoyle Guardian */}
          <div className="hidden sm:block -ml-3 z-20 pointer-events-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.95)]">
            <GargoyleStatuette flip />
          </div>
        </div>

        {/* ===================================================================
            BOTTOM-RIGHT 2x2 GOLD MEDALLION CLUSTER (Matching image_5f5e217c.png)
           =================================================================== */}
        <div className="pointer-events-auto absolute bottom-0 right-0 grid grid-cols-2 gap-2">
          {/* 1. Inventory Backpack Medallion */}
          <button
            id="inventory-btn"
            onClick={onOpenInventory}
            title="Inventory & Gear (I / B)"
            className="w-12 h-12 rounded-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <ActionSlotArtwork kind="backpack" size={30} />
          </button>

          {/* 2. Hero Sheet / Tome Medallion */}
          <button
            id="char-sheet-btn"
            onClick={onOpenCharacterSheet}
            title="Hero Attributes & Stats (C)"
            className="relative w-12 h-12 rounded-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <ActionSlotArtwork kind="char_tome" size={30} />
            {unallocatedStatPoints > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-mono font-extrabold text-[10px] flex items-center justify-center border border-stone-950 animate-bounce">
                {unallocatedStatPoints}
              </span>
            )}
          </button>

          {/* 3. Chronicle / Controls Guide Scroll Medallion */}
          <button
            id="guide-toggle-btn"
            onClick={onToggleGuide}
            title="Dungeon Delver Controls Guide (H)"
            className="w-12 h-12 rounded-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <ActionSlotArtwork kind="quest_scroll" size={30} />
          </button>

          {/* 4. Pause & Settings Gear Medallion */}
          <button
            id="menu-btn"
            onClick={onOpenMenu}
            title="Pause & Settings Menu (Esc)"
            className="w-12 h-12 rounded-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-400 shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <ActionSlotArtwork kind="settings_gear" size={30} />
          </button>
        </div>
      </div>
    </div>
  );
};
