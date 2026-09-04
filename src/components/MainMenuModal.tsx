import React, { useState } from 'react';
import { Play, RotateCcw, LogOut, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { hasSavedCheckpoint, loadFloorCheckpoint } from '../engine/checkpoint';

interface MainMenuModalProps {
  onNewGame: () => void;
  onContinue: () => void;
  onQuit: () => void;
  isPausedMode?: boolean;
  onResume?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  onNewGame,
  onContinue,
  onQuit,
  isPausedMode = false,
  onResume,
  isMuted,
  onToggleMute,
}) => {
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);
  const [showConfirmQuit, setShowConfirmQuit] = useState(false);
  const savedData = loadFloorCheckpoint();
  const canContinue = hasSavedCheckpoint();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none">
      {/* Dark fantasy ambient glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-rose-600/10 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Title Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3 tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            2.5D Isometric Action RPG
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-wider drop-shadow-md">
            DUNGEON TROUBLE
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide">
            {isPausedMode ? '— GAME PAUSED —' : 'Venture Into the Crypt of Ruin'}
          </p>
        </div>

        {/* Menu Actions */}
        <div className="w-full space-y-3">
          {isPausedMode && onResume && (
            <button
              id="menu-resume-btn"
              onClick={onResume}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-cinzel font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Resume Delve</span>
            </button>
          )}

          {/* Continue Button */}
          <button
            id="menu-continue-btn"
            disabled={!canContinue}
            onClick={() => {
              if (canContinue) {
                onContinue();
              }
            }}
            className={`w-full py-3.5 px-6 rounded-xl font-cinzel font-bold text-base flex items-center justify-between border transition-all ${
              canContinue
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400/80 shadow-lg shadow-amber-950/50 cursor-pointer active:scale-98'
                : 'bg-slate-950/50 text-slate-600 border-slate-800/80 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5" />
              <span>Continue</span>
            </div>
            {savedData && (
              <span className="text-xs font-mono font-normal opacity-85">
                Floor {savedData.currentFloor} (Lv.{savedData.playerStats.level})
              </span>
            )}
          </button>

          {/* New Game Button */}
          {!showConfirmNewGame ? (
            <button
              id="menu-newgame-btn"
              onClick={() => {
                if (canContinue && !isPausedMode) {
                  setShowConfirmNewGame(true);
                } else {
                  onNewGame();
                }
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-100 border border-slate-700/90 font-cinzel font-bold text-base flex items-center justify-center gap-3 shadow transition-all active:scale-98"
            >
              <Play className="w-5 h-5 text-amber-400" />
              <span>New Game</span>
            </button>
          ) : (
            <div className="bg-slate-950/90 border border-amber-600/50 rounded-xl p-3 text-left">
              <p className="text-xs text-amber-300 font-semibold mb-2">
                Start a fresh run? This will start at Floor 1.
              </p>
              <div className="flex gap-2">
                <button
                  id="confirm-newgame-btn"
                  onClick={() => {
                    setShowConfirmNewGame(false);
                    onNewGame();
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-cinzel transition"
                >
                  Confirm & Start
                </button>
                <button
                  onClick={() => setShowConfirmNewGame(false)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Quit Button */}
          {!showConfirmQuit ? (
            <button
              id="menu-quit-btn"
              onClick={() => setShowConfirmQuit(true)}
              className="w-full py-3 px-6 rounded-xl bg-slate-950/60 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-900/60 font-cinzel font-semibold text-sm flex items-center justify-center gap-3 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Quit</span>
            </button>
          ) : (
            <div className="bg-slate-950/90 border border-rose-800/60 rounded-xl p-3 text-left">
              <p className="text-xs text-rose-300 font-semibold mb-2">
                {isPausedMode
                  ? 'Exit active run to main title screen?'
                  : 'Quit game session? Checkpoint is saved.'}
              </p>
              <div className="flex gap-2">
                <button
                  id="confirm-quit-btn"
                  onClick={() => {
                    setShowConfirmQuit(false);
                    onQuit();
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-100 text-xs font-bold font-cinzel transition"
                >
                  Exit Game
                </button>
                <button
                  onClick={() => setShowConfirmQuit(false)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls & SFX toggle */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
            <span>Sound: {isMuted ? 'Muted' : 'On'}</span>
          </button>
          <span className="font-mono text-[11px] text-slate-500">v0.2.0 • Isometric</span>
        </div>
      </div>
    </div>
  );
};
