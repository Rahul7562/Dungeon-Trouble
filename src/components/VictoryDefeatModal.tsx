import React from 'react';
import { RotateCcw, Trophy, Skull } from 'lucide-react';

interface VictoryDefeatModalProps {
  isVictory: boolean;
  onRestart: () => void;
  level: number;
  gold: number;
}

export const VictoryDefeatModal: React.FC<VictoryDefeatModalProps> = ({
  isVictory,
  onRestart,
  level,
  gold,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
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

        <button
          id="restart-run-btn"
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-cinzel text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{isVictory ? 'Begin New Conquest' : 'Try Again'}</span>
        </button>
      </div>
    </div>
  );
};
