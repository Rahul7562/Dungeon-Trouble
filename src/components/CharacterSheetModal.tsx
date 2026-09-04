import React from 'react';
import { GameEngine } from '../engine/gameEngine';
import { AttributeType, StatType } from '../engine/types';
import { getStatName } from '../engine/stats';
import { X, Plus, Shield, Zap, Sparkles, Heart } from 'lucide-react';

interface CharacterSheetModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({ engine, onClose }) => {
  const { playerStats, unallocatedStatPoints } = engine.state;
  const { attributes, calculated } = playerStats;

  const attrList = [
    {
      type: AttributeType.STR,
      name: 'Strength (STR)',
      desc: '+2 Attack Power, +0.5 Armor per point',
      icon: <Shield className="w-4 h-4 text-orange-400" />,
    },
    {
      type: AttributeType.DEX,
      name: 'Dexterity (DEX)',
      desc: '+1 Attack Power, +0.5 Armor, +0.3 Evasion, +0.1% Crit',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
    },
    {
      type: AttributeType.INT,
      name: 'Intelligence (INT)',
      desc: '+8 Max Mana, +2 Spell Power, +Mana Regen',
      icon: <Sparkles className="w-4 h-4 text-sky-400" />,
    },
    {
      type: AttributeType.VIT,
      name: 'Vitality (VIT)',
      desc: '+10 Max Health per point',
      icon: <Heart className="w-4 h-4 text-rose-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-w-xl w-full">
        {/* Close */}
        <button
          id="close-char-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h2 className="font-cinzel text-xl font-bold text-amber-400">Hero Attributes</h2>
            <p className="text-xs text-slate-400">Level {playerStats.level} Dungeon Delver</p>
          </div>
          {unallocatedStatPoints > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1 text-xs font-semibold text-amber-300 animate-pulse">
              {unallocatedStatPoints} Points Available
            </div>
          )}
        </div>

        {/* Primary Attributes */}
        <div className="space-y-2 mb-6">
          {attrList.map((attr) => (
            <div
              key={attr.type}
              className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3"
            >
              <div className="flex items-center gap-2.5">
                {attr.icon}
                <div>
                  <div className="text-sm font-semibold text-slate-200">{attr.name}</div>
                  <div className="text-[11px] text-slate-400">{attr.desc}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-slate-100">
                  {attributes[attr.type]}
                </span>
                {unallocatedStatPoints > 0 && (
                  <button
                    id={`alloc-btn-${attr.type}`}
                    onClick={() => engine.allocateAttribute(attr.type)}
                    className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95"
                    title="Allocate 1 point"
                  >
                    <Plus className="w-4 h-4 font-bold" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Derived Combat Statistics */}
        <div>
          <h3 className="font-cinzel text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            Derived Combat Statistics
          </h3>
          <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Max Health:</span>
              <span className="font-mono font-semibold text-rose-400">
                {calculated[StatType.MaxHealth]}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Max Mana:</span>
              <span className="font-mono font-semibold text-sky-400">
                {calculated[StatType.MaxMana]}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Attack Power:</span>
              <span className="font-mono font-semibold text-amber-300">
                {calculated[StatType.AttackPower]}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Spell Power:</span>
              <span className="font-mono font-semibold text-purple-300">
                {calculated[StatType.SpellPower]}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Armor Rating:</span>
              <span className="font-mono font-semibold text-slate-200">
                {calculated[StatType.Armor]} ({Math.round((calculated[StatType.Armor] / (calculated[StatType.Armor] + 100)) * 100)}% mitigation)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Evasion Chance:</span>
              <span className="font-mono font-semibold text-slate-200">
                {calculated[StatType.Evasion].toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Critical Strike:</span>
              <span className="font-mono font-semibold text-amber-400">
                {calculated[StatType.CritChance].toFixed(1)}% ({calculated[StatType.CritMultiplier]}% dmg)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Move Speed:</span>
              <span className="font-mono font-semibold text-slate-200">
                {calculated[StatType.MoveSpeed]}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
