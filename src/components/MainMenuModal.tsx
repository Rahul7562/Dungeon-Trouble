import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Check,
  ChevronLeft,
  Sword,
  BookOpen,
  DoorOpen,
} from 'lucide-react';
import { hasSavedCheckpoint, loadFloorCheckpoint } from '../engine/checkpoint';
import { GameEngine } from '../engine/gameEngine';
import { StatType } from '../engine/types';
import { sound } from '../engine/audio';
import { ClassPortraitArt, ActionSlotArtwork } from './RpgArtAssets';

interface MainMenuModalProps {
  engine?: GameEngine;
  onNewGame: () => void;
  onContinue: () => void;
  onSelectClass?: () => void;
  onOpenInventory?: () => void;
  onQuit: () => void;
  isPausedMode?: boolean;
  onResume?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const EMBER_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${8 + ((i * 37) % 84)}%`,
  delay: `${(i * 0.35) % 4.5}s`,
  duration: `${3.2 + (i % 4) * 0.85}s`,
  size: i % 3 === 0 ? 5 : 3.5,
}));

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  engine,
  onNewGame,
  onContinue,
  onSelectClass,
  onOpenInventory,
  onQuit,
  isPausedMode = false,
  onResume,
  isMuted,
  onToggleMute,
}) => {
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);
  const [showConfirmQuit, setShowConfirmQuit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const audioSettings = sound.getSettings();
  const [masterVol, setMasterVol] = useState(Math.round(audioSettings.masterVolume * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(audioSettings.sfxVolume * 100));
  const [musicVol, setMusicVol] = useState(Math.round(audioSettings.musicVolume * 100));
  const [camZoom, setCamZoom] = useState(engine?.cameraZoom ?? 1.22);
  const [camSens, setCamSens] = useState(engine?.cameraSensitivity ?? 1.0);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>(engine?.renderQuality ?? 'high');

  const savedData = loadFloorCheckpoint();
  const canContinue = hasSavedCheckpoint();

  const handleSaveGame = () => {
    if (engine) {
      engine.autoSave();
    }
    sound.playEquip();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    sound.updateSettings({ masterVolume: val / 100 });
  };

  const handleSfxVolChange = (val: number) => {
    setSfxVol(val);
    sound.updateSettings({ sfxVolume: val / 100 });
  };

  const handleMusicVolChange = (val: number) => {
    setMusicVol(val);
    sound.updateSettings({ musicVolume: val / 100 });
  };

  const handleZoomChange = (val: number) => {
    setCamZoom(val);
    if (engine) {
      engine.setCameraZoom(val);
    }
  };

  const handleSensChange = (val: number) => {
    setCamSens(val);
    if (engine) {
      engine.cameraSensitivity = val;
    }
  };

  const handleQualityChange = (q: 'low' | 'medium' | 'high') => {
    setQuality(q);
    if (engine) {
      engine.renderQuality = q;
    }
  };

  // Hero state for Pause Menu card (matching image_8e6ce0cb.png)
  const heroName = engine?.state.playerName || savedData?.playerName || 'VALERIUS';
  const heroClass = engine?.state.selectedClass || savedData?.selectedClass || 'swordsman';
  const heroLevel = engine?.state.playerStats.level || savedData?.playerStats.level || 1;
  const maxHp = engine?.state.playerStats.calculated[StatType.MaxHealth] || 100;
  const curHp = engine?.state.playerStats.health ?? maxHp;
  const maxMp = engine?.state.playerStats.calculated[StatType.MaxMana] || 60;
  const curMp = engine?.state.playerStats.mana ?? maxMp;
  const hpPct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (curMp / maxMp) * 100));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-hidden ${
        isPausedMode
          ? 'bg-black/75 backdrop-blur-[3px]'
          : 'bg-gradient-to-b from-amber-950/45 via-slate-950/55 to-black/80 backdrop-blur-[2px]'
      }`}
    >
      {/* Warm Golden-Hour Atmosphere & Rising Fire Embers on Main Title Screen (image_2ae4c545.png) */}
      {!isPausedMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Warm sunset haze & fountain plaza vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(245,158,11,0.22),rgba(15,23,42,0.55)_65%,rgba(2,6,23,0.88)_100%)]" />

          {/* Left & Right Flickering Wall Torches (matching image_2ae4c545.png) */}
          <div className="hidden md:flex flex-col items-center absolute left-5 top-1/2 -translate-y-1/2">
            <div className="w-16 h-16 rounded-full bg-orange-500/35 blur-xl animate-pulse" />
            <div className="w-5 h-9 -mt-12 rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[1px] animate-bounce" />
            <div className="w-3.5 h-12 bg-gradient-to-b from-stone-600 to-stone-900 border border-amber-700/60 rounded-b-md shadow-lg" />
          </div>
          <div className="hidden md:flex flex-col items-center absolute right-5 top-1/2 -translate-y-1/2">
            <div className="w-16 h-16 rounded-full bg-orange-500/35 blur-xl animate-pulse" />
            <div className="w-5 h-9 -mt-12 rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[1px] animate-bounce" />
            <div className="w-3.5 h-12 bg-gradient-to-b from-stone-600 to-stone-900 border border-amber-700/60 rounded-b-md shadow-lg" />
          </div>

          {/* Rising glowing ember sparks */}
          {EMBER_PARTICLES.map((e) => (
            <span
              key={e.id}
              className="absolute bottom-8 rounded-full bg-amber-300 shadow-[0_0_8px_#f97316] animate-ping"
              style={{
                left: e.left,
                width: `${e.size}px`,
                height: `${e.size}px`,
                animationDelay: e.delay,
                animationDuration: e.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* Ornate Iron & Gold-Filigree Screen Corner Brackets & Hanging Tattered Banners (image_2ae4c545.png & image_8e6ce0cb.png) */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-Left Corner Bracket & Tattered Banner */}
        <div className="absolute top-0 left-0 w-36 h-48">
          <svg viewBox="0 0 150 200" className="w-full h-full drop-shadow-2xl">
            {!isPausedMode && (
              <g>
                {/* Tattered dark-iron & gold heraldic banner */}
                <path
                  d="M22 18 L68 18 L68 158 L54 142 L45 166 L34 145 L22 162 Z"
                  fill="#292524"
                  stroke="#b45309"
                  strokeWidth="2"
                />
                <path d="M35 55 L45 40 L55 55 L45 95 Z" fill="#d97706" opacity="0.65" />
                {/* Hanging iron chains */}
                <path d="M0 95 Q55 75 105 0" stroke="#57534e" strokeWidth="4" strokeDasharray="6 3" fill="none" />
              </g>
            )}
            <path d="M0 0 L115 0 L95 22 L22 22 L22 95 L0 115 Z" fill="#44403c" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="14" cy="14" r="5" fill="#fbbf24" />
          </svg>
        </div>

        {/* Top-Right Corner Bracket & Tattered Banner */}
        <div className="absolute top-0 right-0 w-36 h-48 -scale-x-100">
          <svg viewBox="0 0 150 200" className="w-full h-full drop-shadow-2xl">
            {!isPausedMode && (
              <g>
                <path
                  d="M22 18 L68 18 L68 158 L54 142 L45 166 L34 145 L22 162 Z"
                  fill="#292524"
                  stroke="#b45309"
                  strokeWidth="2"
                />
                <path d="M35 55 L45 40 L55 55 L45 95 Z" fill="#d97706" opacity="0.65" />
                <path d="M0 95 Q55 75 105 0" stroke="#57534e" strokeWidth="4" strokeDasharray="6 3" fill="none" />
              </g>
            )}
            <path d="M0 0 L115 0 L95 22 L22 22 L22 95 L0 115 Z" fill="#44403c" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="14" cy="14" r="5" fill="#fbbf24" />
          </svg>
        </div>

        {/* Bottom-Left Corner Bracket */}
        <div className="absolute bottom-0 left-0 w-28 h-28 -scale-y-100">
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl">
            <path d="M0 0 L95 0 L78 18 L18 18 L18 78 L0 95 Z" fill="#44403c" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="4.5" fill="#fbbf24" />
          </svg>
        </div>

        {/* Bottom-Right Corner Bracket */}
        <div className="absolute bottom-0 right-0 w-28 h-28 -scale-x-100 -scale-y-100">
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl">
            <path d="M0 0 L95 0 L78 18 L18 18 L18 78 L0 95 Z" fill="#44403c" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="4.5" fill="#fbbf24" />
          </svg>
        </div>
      </div>

      {/* =====================================================================
          SETTINGS SUB-MODAL (Audio, 2.5D Camera Zoom/Sensitivity, Graphics)
         ===================================================================== */}
      {showSettings ? (
        <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 border-2 border-amber-500/80 rounded-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] text-amber-100">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-600/40">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h2 className="font-cinzel font-bold text-xl tracking-wider text-amber-300">
                SANCTUARY & CAMERA SETTINGS
              </h2>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-xs font-cinzel font-bold text-amber-200 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Master Volume */}
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-200">Master Volume</span>
                <span className="font-mono text-amber-400">{masterVol}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={masterVol}
                onChange={(e) => handleMasterVolChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Sound Effects Volume */}
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-200">Combat & World SFX Volume</span>
                <span className="font-mono text-amber-400">{sfxVol}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sfxVol}
                onChange={(e) => handleSfxVolChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Ambient Soundscape Volume */}
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-200">Town & Dungeon Ambience</span>
                <span className="font-mono text-amber-400">{musicVol}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={musicVol}
                onChange={(e) => handleMusicVolChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 2.5D Camera Zoom Scale */}
            <div className="pt-2 border-t border-stone-800">
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-200">2.5D Camera Zoom Framing</span>
                <span className="font-mono text-amber-400">{camZoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.85}
                max={1.5}
                step={0.05}
                value={camZoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                <span>0.85x Wide Tactical</span>
                <span>1.22x Heroic (Default)</span>
                <span>1.50x Close-Up</span>
              </div>
            </div>

            {/* Camera Look-Ahead Sensitivity */}
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-200">Camera Look-Ahead Tracking</span>
                <span className="font-mono text-amber-400">{Math.round(camSens * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.1}
                value={camSens}
                onChange={(e) => handleSensChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Graphics & Lighting Quality */}
            <div className="pt-2 border-t border-stone-800">
              <span className="block text-amber-200 font-semibold mb-2">Lighting & Particle Detail</span>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-2 rounded border font-cinzel font-bold uppercase text-xs transition ${
                      quality === q
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-inner'
                        : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="mt-6 w-full py-2.5 rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-extrabold text-sm tracking-wider shadow-lg transition"
          >
            APPLY & RETURN
          </button>
        </div>
      ) : isPausedMode ? (
        /* =====================================================================
           PAUSE MENU OVERLAY — Matching Reference image_8e6ce0cb.png
           ===================================================================== */
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          {/* Glowing Golden Title Header */}
          <h1 className="font-cinzel text-3xl sm:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 drop-shadow-[0_4px_12px_rgba(245,158,11,0.55)] mb-3">
            DUNGEON TROUBLE
          </h1>

          {/* Ornate Stone & Leather Modal Frame */}
          <div className="relative w-full bg-gradient-to-b from-[#3d352e] via-[#2c2520] to-[#1f1a17] border-[3px] border-amber-500/80 rounded-xl pt-8 pb-6 px-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            {/* Scrolled Parchment "PAUSED" Ribbon at Top Center */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-8 py-1 bg-gradient-to-b from-[#e7d4b5] via-[#cbb089] to-[#a68963] border-2 border-[#5c4028] rounded shadow-lg">
              <span className="font-cinzel font-black text-sm tracking-[0.2em] text-[#2c1d11]">
                PAUSED
              </span>
            </div>

            {/* Corner Gold Filigree Accents */}
            <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
            <span className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
            <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
            <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

            {/* Hero Summary Card (Portrait, Name, Level, Mini HP/MP Bars) */}
            <div className="flex items-center gap-3.5 bg-[#231d19] border-2 border-amber-600/50 rounded-lg p-2.5 mb-5 shadow-inner">
              <div className="w-12 h-12 rounded border-2 border-amber-400/80 overflow-hidden shrink-0 bg-stone-950 shadow">
                <ClassPortraitArt heroClass={heroClass} size={44} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-cinzel font-extrabold text-sm text-amber-200 tracking-wide truncate uppercase">
                  {heroName}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="font-cinzel font-bold text-xs text-amber-400/90">
                    LVL {heroLevel}
                  </span>
                  <div className="flex-1 max-w-[120px] space-y-1">
                    {/* Mini HP Bar */}
                    <div className="h-1.5 w-full bg-stone-950 rounded-full overflow-hidden border border-rose-950">
                      <div
                        className="h-full bg-gradient-to-r from-red-700 to-rose-500"
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    {/* Mini MP Bar */}
                    <div className="h-1.5 w-full bg-stone-950 rounded-full overflow-hidden border border-sky-950">
                      <div
                        className="h-full bg-gradient-to-r from-blue-700 to-sky-400"
                        style={{ width: `${mpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chiseled Stone Pause Menu Buttons (Matching image_8e6ce0cb.png) */}
            <div className="space-y-3">
              {/* RESUME */}
              {onResume && (
                <button
                  id="menu-resume-btn"
                  onClick={onResume}
                  className="group relative w-full py-3 px-5 rounded-lg bg-gradient-to-b from-stone-600 via-stone-700 to-stone-800 hover:from-stone-500 hover:to-stone-700 border-2 border-amber-400/90 shadow-lg flex items-center justify-between transition active:scale-98"
                >
                  <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-stone-950" />
                  <span className="font-cinzel font-extrabold text-base tracking-[0.14em] text-amber-100 group-hover:text-yellow-200 drop-shadow">
                    RESUME
                  </span>
                  <Sword className="w-5 h-5 text-sky-300 group-hover:rotate-12 transition-transform" />
                </button>
              )}

              {/* SAVE GAME */}
              <button
                id="menu-save-btn"
                onClick={handleSaveGame}
                className="group relative w-full py-3 px-5 rounded-lg bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-500/75 shadow-lg flex items-center justify-between transition active:scale-98"
              >
                <span className="w-2 h-2 rotate-45 bg-amber-500/80" />
                <span className="font-cinzel font-extrabold text-base tracking-[0.12em] text-amber-100 group-hover:text-yellow-200">
                  {saveFeedback ? 'GAME SAVED!' : 'SAVE GAME'}
                </span>
                {saveFeedback ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <BookOpen className="w-5 h-5 text-amber-300" />
                )}
              </button>

              {/* INVENTORY */}
              {onOpenInventory && (
                <button
                  id="menu-inventory-btn"
                  onClick={() => {
                    onResume?.();
                    onOpenInventory();
                  }}
                  className="group relative w-full py-3 px-5 rounded-lg bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-500/75 shadow-lg flex items-center justify-between transition active:scale-98"
                >
                  <span className="w-2 h-2 rotate-45 bg-amber-500/80" />
                  <span className="font-cinzel font-extrabold text-base tracking-[0.12em] text-amber-100 group-hover:text-yellow-200">
                    INVENTORY
                  </span>
                  <div className="w-6 h-6 flex items-center justify-center">
                    <ActionSlotArtwork kind="backpack" size={24} />
                  </div>
                </button>
              )}

              {/* SETTINGS */}
              <button
                id="menu-settings-btn"
                onClick={() => setShowSettings(true)}
                className="group relative w-full py-2.5 px-5 rounded-lg bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 hover:from-stone-600 hover:to-stone-800 border-2 border-amber-500/70 shadow-lg flex items-center justify-between transition active:scale-98"
              >
                <span className="w-2 h-2 rotate-45 bg-amber-500/80" />
                <span className="font-cinzel font-extrabold text-sm tracking-[0.12em] text-amber-100 group-hover:text-yellow-200">
                  SETTINGS & CAMERA
                </span>
                <Sliders className="w-4 h-4 text-amber-300" />
              </button>

              {/* QUIT TO TITLE */}
              {!showConfirmQuit ? (
                <button
                  id="menu-quit-btn"
                  onClick={() => setShowConfirmQuit(true)}
                  className="group relative w-full py-3 px-5 rounded-lg bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 hover:from-rose-950/70 hover:to-stone-900 border-2 border-amber-500/75 hover:border-rose-500/75 shadow-lg flex items-center justify-between transition active:scale-98"
                >
                  <span className="w-2 h-2 rotate-45 bg-amber-500/80" />
                  <span className="font-cinzel font-extrabold text-base tracking-[0.12em] text-amber-100 group-hover:text-rose-200">
                    QUIT TO TITLE
                  </span>
                  <DoorOpen className="w-5 h-5 text-amber-400 group-hover:text-rose-300" />
                </button>
              ) : (
                <div className="bg-stone-950/95 border-2 border-rose-700/70 rounded-lg p-3 text-left">
                  <p className="text-xs text-rose-200 font-semibold mb-2">
                    Return to the Main Title Screen? Progress is automatically saved.
                  </p>
                  <div className="flex gap-2">
                    <button
                      id="confirm-quit-btn"
                      onClick={() => {
                        setShowConfirmQuit(false);
                        onQuit();
                      }}
                      className="flex-1 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold font-cinzel transition"
                    >
                      ExitGame
                    </button>
                    <button
                      onClick={() => setShowConfirmQuit(false)}
                      className="py-1.5 px-3 rounded bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           MAIN MENU TITLE SCREEN — Matching Reference image_2ae4c545.png
           ===================================================================== */
        <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
          {/* Spiked Forged-Iron & Gold Crest Logo ("DUNGEON TROUBLE") */}
          <div className="relative mb-7 flex flex-col items-center">
            {/* Decorative Top & Side Crest Spikes */}
            <div className="relative px-8 py-5 rounded-xl bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-[3px] border-amber-500 shadow-[0_14px_40px_rgba(0,0,0,0.9)]">
              {/* Top center spike */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-gradient-to-br from-amber-300 to-amber-700 border-2 border-stone-950" />
              {/* Left & right side spikes */}
              <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-4 h-4 rotate-45 bg-stone-400 border border-stone-950" />
              <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-4 rotate-45 bg-stone-400 border border-stone-950" />

              {/* Inner dark bevel frame */}
              <div className="px-4 py-1 border border-amber-400/40 rounded bg-gradient-to-b from-stone-900/90 to-stone-950/95">
                <h1 className="font-cinzel text-4xl sm:text-5xl font-black tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-300 to-stone-500 drop-shadow-[0_3px_4px_rgba(0,0,0,0.95)] leading-none">
                  DUNGEON
                </h1>
                <div className="font-cinzel text-2xl sm:text-3xl font-black tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-b from-stone-100 via-stone-300 to-stone-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] mt-1">
                  TROUBLE
                </div>
              </div>
            </div>

            {/* Scrolled Parchment Ribbon Tail Below Crest */}
            <div className="-mt-2 px-6 py-0.5 bg-gradient-to-r from-amber-800 via-amber-200 to-amber-800 border border-stone-900 rounded-sm shadow-md">
              <span className="font-cinzel font-bold text-[10px] tracking-[0.22em] text-stone-950 uppercase">
                Sanctuary of Oakridge & The 10-Floor Abyss
              </span>
            </div>
          </div>

          {/* 4 Heavy Chiseled-Stone & Gold-Filigree Menu Buttons (Matching image_2ae4c545.png) */}
          <div className="w-full max-w-sm space-y-3.5">
            {/* 1. NEW GAME */}
            {!showConfirmNewGame ? (
              <button
                id="menu-newgame-btn"
                onClick={() => {
                  if (canContinue) {
                    setShowConfirmNewGame(true);
                  } else {
                    onNewGame();
                  }
                }}
                className="group relative w-full py-3.5 px-8 rounded-md bg-gradient-to-b from-[#57534e] via-[#3f3c38] to-[#292524] hover:from-[#69635c] hover:via-[#4d4843] hover:to-[#332e2b] border-2 border-amber-500/90 shadow-[0_8px_22px_rgba(0,0,0,0.85)] flex items-center justify-center transition-all active:scale-98 cursor-pointer"
              >
                <span className="absolute left-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
                <span className="font-cinzel font-extrabold text-xl tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 group-hover:from-yellow-100 group-hover:to-amber-400 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                  NEW GAME
                </span>
                <span className="absolute right-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
              </button>
            ) : (
              <div className="bg-stone-950/95 border-2 border-amber-500/80 rounded-lg p-3.5 text-left shadow-2xl">
                <p className="text-xs text-amber-200 font-semibold mb-2.5">
                  Begin a new adventure? You can choose your Hero Class and Name next.
                </p>
                <div className="flex gap-2">
                  <button
                    id="confirm-newgame-btn"
                    onClick={() => {
                      setShowConfirmNewGame(false);
                      onNewGame();
                    }}
                    className="flex-1 py-2 rounded bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 text-xs font-extrabold font-cinzel transition"
                  >
                    Confirm & Start
                  </button>
                  <button
                    onClick={() => setShowConfirmNewGame(false)}
                    className="py-2 px-3 rounded bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 2. CONTINUE */}
            <button
              id="menu-continue-btn"
              disabled={!canContinue}
              onClick={() => {
                if (canContinue) {
                  onContinue();
                }
              }}
              className={`group relative w-full py-3.5 px-8 rounded-md border-2 shadow-[0_8px_22px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center transition-all ${
                canContinue
                  ? 'bg-gradient-to-b from-[#57534e] via-[#3f3c38] to-[#292524] hover:from-[#69635c] hover:via-[#4d4843] hover:to-[#332e2b] border-amber-500/90 cursor-pointer active:scale-98'
                  : 'bg-stone-950/75 border-stone-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="absolute left-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
              <span className="font-cinzel font-extrabold text-xl tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                CONTINUE
              </span>
              {savedData && (
                <span className="text-[10px] font-mono text-amber-300/90 mt-0.5 capitalize">
                  {savedData.playerName} • Lv.{savedData.playerStats.level} {savedData.selectedClass} • Floor{' '}
                  {savedData.currentFloor}
                </span>
              )}
              <span className="absolute right-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
            </button>

            {/* 3. SELECT CLASS */}
            <button
              id="menu-select-class-btn"
              onClick={() => (onSelectClass ? onSelectClass() : onNewGame())}
              className="group relative w-full py-3.5 px-8 rounded-md bg-gradient-to-b from-[#57534e] via-[#3f3c38] to-[#292524] hover:from-[#69635c] hover:via-[#4d4843] hover:to-[#332e2b] border-2 border-amber-500/90 shadow-[0_8px_22px_rgba(0,0,0,0.85)] flex items-center justify-center transition-all active:scale-98 cursor-pointer"
            >
              <span className="absolute left-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
              <span className="font-cinzel font-extrabold text-xl tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 group-hover:from-yellow-100 group-hover:to-amber-400 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                SELECT CLASS
              </span>
              <span className="absolute right-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
            </button>

            {/* 4. QUIT */}
            {!showConfirmQuit ? (
              <button
                id="menu-quit-btn"
                onClick={() => setShowConfirmQuit(true)}
                className="group relative w-full py-3.5 px-8 rounded-md bg-gradient-to-b from-[#57534e] via-[#3f3c38] to-[#292524] hover:from-[#69635c] hover:via-[#4d4843] hover:to-[#332e2b] border-2 border-amber-500/90 shadow-[0_8px_22px_rgba(0,0,0,0.85)] flex items-center justify-center transition-all active:scale-98 cursor-pointer"
              >
                <span className="absolute left-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
                <span className="font-cinzel font-extrabold text-xl tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 group-hover:from-yellow-100 group-hover:to-amber-400 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                  QUIT
                </span>
                <span className="absolute right-2.5 w-2.5 h-2.5 rotate-45 bg-stone-300 border border-stone-950" />
              </button>
            ) : (
              <div className="bg-stone-950/95 border-2 border-rose-700/80 rounded-lg p-3.5 text-left shadow-2xl">
                <p className="text-xs text-rose-200 font-semibold mb-2.5">
                  Close menu and enter Sanctuary preview, or reset session?
                </p>
                <div className="flex gap-2">
                  <button
                    id="confirm-quit-btn"
                    onClick={() => {
                      setShowConfirmQuit(false);
                      onQuit();
                    }}
                    className="flex-1 py-2 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold font-cinzel transition"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowConfirmQuit(false)}
                    className="py-2 px-3 rounded bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar: Audio Toggle & Settings */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-amber-500/40 text-xs font-cinzel font-bold text-amber-200 transition shadow"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
              <span>{isMuted ? 'Audio Muted' : 'Audio Active'}</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 border border-amber-500/40 text-xs font-cinzel font-bold text-amber-200 transition shadow"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings & Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Version Stamp in Bottom Right (Matching image_2ae4c545.png) */}
      <div className="pointer-events-none absolute bottom-2.5 right-4 font-mono text-[11px] font-bold text-amber-200/70 drop-shadow">
        v1.0.2
      </div>
    </div>
  );
};
