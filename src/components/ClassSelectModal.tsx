import React, { useState } from 'react';
import { CharacterClass, AttributeType } from '../engine/types';
import { CLASS_DEFINITIONS } from '../engine/classes';
import {
  Sword,
  Crosshair,
  Sparkles,
  Skull,
  Shield,
  Zap,
  Flame,
  Snowflake,
  RotateCw,
  Hammer,
  Split,
  CloudRain,
  Wind,
  Ghost,
  HeartCrack,
  ShieldAlert,
  ArrowRight,
  X,
  AlertTriangle,
  User,
} from 'lucide-react';

interface ClassSelectModalProps {
  initialPlayerName: string;
  currentClass: CharacterClass;
  onSelectClass: (selectedClass: CharacterClass, playerName: string) => void;
  onClose: () => void;
  hasExistingSave: boolean;
}

export const ClassSelectModal: React.FC<ClassSelectModalProps> = ({
  initialPlayerName,
  currentClass,
  onSelectClass,
  onClose,
  hasExistingSave,
}) => {
  const [activeClass, setActiveClass] = useState<CharacterClass>(currentClass || 'swordsman');
  const [playerName, setPlayerName] = useState<string>(initialPlayerName || 'Valerius');
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedDef = CLASS_DEFINITIONS[activeClass];

  const getClassIcon = (cls: CharacterClass, className = 'w-6 h-6') => {
    switch (cls) {
      case 'swordsman':
        return <Sword className={className} />;
      case 'archer':
        return <Crosshair className={className} />;
      case 'mage':
        return <Sparkles className={className} />;
      case 'necromancer':
        return <Skull className={className} />;
    }
  };

  const getAbilityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sword':
        return <Sword className="w-4 h-4 text-amber-300" />;
      case 'Hammer':
        return <Hammer className="w-4 h-4 text-orange-400" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-sky-300" />;
      case 'RotateCw':
        return <RotateCw className="w-4 h-4 text-yellow-300" />;
      case 'Crosshair':
        return <Crosshair className="w-4 h-4 text-emerald-300" />;
      case 'Split':
      case 'Splits':
        return <Split className="w-4 h-4 text-teal-300" />;
      case 'CloudRain':
        return <CloudRain className="w-4 h-4 text-cyan-300" />;
      case 'Wind':
        return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Snowflake':
        return <Snowflake className="w-4 h-4 text-cyan-300" />;
      case 'Ghost':
        return <Ghost className="w-4 h-4 text-purple-300" />;
      case 'HeartCrack':
        return <HeartCrack className="w-4 h-4 text-rose-400" />;
      case 'Skull':
        return <Skull className="w-4 h-4 text-purple-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-violet-300" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-300" />;
    }
  };

  const handleStart = () => {
    const finalName = playerName.trim() || 'Valerius';
    onSelectClass(activeClass, finalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-cinzel text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
            Create Hero & Select Class
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose your hero discipline and embark from Town-1 sanctuary into the crypt.
          </p>
          
          {/* Player Name Input */}
          <div className="mt-4 flex items-center justify-center">
            <div className="relative w-full max-w-xs flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-amber-400" />
              <input
                id="hero-name-input"
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Hero Name"
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 font-cinzel font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 text-center"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Initiating a new character starts you at the Town-1 hub to prepare and speak with villagers.</span>
          </div>
        </div>

        {/* Class Selection Tabs / Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(Object.keys(CLASS_DEFINITIONS) as CharacterClass[]).map((clsKey) => {
            const def = CLASS_DEFINITIONS[clsKey];
            const isSelected = activeClass === clsKey;
            return (
              <button
                key={clsKey}
                id={`select-class-${clsKey}`}
                onClick={() => {
                  setActiveClass(clsKey);
                  setShowConfirm(false);
                }}
                className={`flex flex-col items-center p-4 rounded-2xl border transition-all text-center ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-950/40 ring-2 ring-amber-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-inner"
                  style={{ backgroundColor: `${def.color}15`, color: def.color }}
                >
                  {getClassIcon(clsKey, 'w-6 h-6')}
                </div>
                <span className="font-cinzel font-bold text-sm text-slate-100">{def.name}</span>
                <span className="text-[11px] text-slate-400 mt-0.5">{def.role}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed Class Overview */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-cinzel text-xl font-bold"
                  style={{ color: selectedDef.accentColor }}
                >
                  {selectedDef.name} — {selectedDef.title}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {selectedDef.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {selectedDef.description}
              </p>
            </div>

            {/* Base Attributes Mini Grid */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl shrink-0">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-mono">STR</div>
                <div className="font-mono font-bold text-sm text-orange-400">
                  {selectedDef.baseAttributes[AttributeType.STR]}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-mono">DEX</div>
                <div className="font-mono font-bold text-sm text-emerald-400">
                  {selectedDef.baseAttributes[AttributeType.DEX]}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-mono">INT</div>
                <div className="font-mono font-bold text-sm text-sky-400">
                  {selectedDef.baseAttributes[AttributeType.INT]}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-mono">VIT</div>
                <div className="font-mono font-bold text-sm text-rose-400">
                  {selectedDef.baseAttributes[AttributeType.VIT]}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Unique Abilities Preview */}
          <div>
            <div className="text-xs font-cinzel font-bold text-slate-300 mb-3 uppercase tracking-wider">
              Class Abilities & Disciplines
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedDef.abilities.map((ab) => (
                <div
                  key={ab.id}
                  className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 shrink-0">
                    {getAbilityIcon(ab.icon || 'Sparkles')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-cinzel text-xs font-bold text-slate-200">
                        {ab.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                        {ab.key}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {ab.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-500">
                      <span>CD: {ab.cooldownSec}s</span>
                      {ab.manaCost > 0 && <span className="text-sky-400">Cost: {ab.manaCost} MP</span>}
                      {ab.baseDamage > 0 && <span className="text-amber-400">Power: {ab.baseDamage}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirmation & Play Button */}
        {!showConfirm ? (
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={onClose}
              className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-cinzel transition"
            >
              Cancel
            </button>
            <button
              id="confirm-class-btn"
              onClick={() => {
                if (hasExistingSave) {
                  setShowConfirm(true);
                } else {
                  handleStart();
                }
              }}
              className="py-3 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-cinzel font-bold text-base shadow-lg shadow-amber-950/40 flex items-center gap-2 transition active:scale-98"
            >
              <span>Begin as {selectedDef.name}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-slate-950 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="text-xs font-bold text-amber-300">
                Are you sure you want to embark as {selectedDef.name}?
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Starting as a new class will reset dungeon floor progression and start fresh at Town-1 fountain.
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                id="start-class-confirmed-btn"
                onClick={handleStart}
                className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-bold text-xs shadow transition active:scale-95"
              >
                Confirm & Delve
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 font-cinzel text-xs hover:bg-slate-700 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
