import React from 'react';
import { RotateCcw, Trophy, Skull, Sparkles } from 'lucide-react';

interface VictoryDefeatModalProps {
  isVictory: boolean;
  onRestart: () => void;
  onSelectClass?: () => void;
  onMainMenu?: () => void;
  level: number;
  gold: number;
}

export const VictoryDefeatModal: React.FC<VictoryDefeatModalProps> = ({
  isVictory,
  onRestart,
  onSelectClass,
  onMainMenu,
  level,
  gold,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="flex justify-center mb-4">
          {isVictory ? (
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Skull className="w-8 h-8" />
            </div>
          )}
        </div>

        <h2 className="font-cinzel text-2xl font-black text-slate-100 mb-2">
          {isVictory ? 'The Abyss Conquered' : 'Slain in Battle'}
        </h2>

        <p className="text-sm text-slate-400 mb-6">
          {isVictory
            ? 'You have vanquished Malakor and shattered the dungeon seals! Your triumph echoes across the realm.'
            : 'Your journey ends in the cold darkness of the crypt. Steel yourself and delve anew.'}
        </p>

        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-6 text-xs">
          <div>
            <span className="text-slate-500 block">Hero Level</span>
            <span className="text-base font-bold text-slate-200">{level}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Gold Amassed</span>
            <span className="text-base font-bold text-amber-400">{gold}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            id="restart-run-btn"
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-cinzel text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{isVictory ? 'Begin New Conquest' : 'Try Again'}</span>
          </button>

          {onSelectClass && (
            <button
              id="change-class-btn"
              onClick={onSelectClass}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold font-cinzel text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Select Different Class / Hero</span>
            </button>
          )}

          {onMainMenu && (
            <button
              id="defeat-main-menu-btn"
              onClick={onMainMenu}
              className="w-full py-2 rounded-xl bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-cinzel text-xs transition cursor-pointer"
            >
              Return to Title Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
