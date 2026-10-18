import React, { useState } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { EquipSlot, ItemStack } from '../engine/types';
import {
  getItemDef,
  getRarityColor,
  getRarityBadgeColor,
  getRarityName,
  getScaledItemModifiers,
} from '../engine/items';
import { getStatName } from '../engine/stats';
import { X, Shield, Sword, Footprints, Crown, Gem, CircleDot, Sparkles, Heart, ArrowUpDown } from 'lucide-react';

interface InventoryModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ engine, onClose }) => {
  const { equipment, inventory } = engine.state;
  const [hoveredStack, setHoveredStack] = useState<ItemStack | null>(null);
  const [, setTick] = useState(0);

  const handleSortBag = () => {
    const nonEmpty = inventory.filter((s): s is ItemStack => s !== null);
    nonEmpty.sort((a, b) => {
      const defA = getItemDef(a.itemDefId);
      const defB = getItemDef(b.itemDefId);
      const rarA = defA?.rarity ?? 0;
      const rarB = defB?.rarity ?? 0;
      if (rarB !== rarA) return rarB - rarA;
      return (defA?.id ?? 0) - (defB?.id ?? 0);
    });
    for (let i = 0; i < inventory.length; i++) {
      inventory[i] = nonEmpty[i] || null;
    }
    engine.autoSave();
    setTick((t) => t + 1);
  };

  const getSlotIcon = (slot: EquipSlot) => {
    switch (slot) {
      case EquipSlot.Head:
        return <Crown className="w-5 h-5 text-slate-500" />;
      case EquipSlot.Chest:
        return <Shield className="w-5 h-5 text-slate-500" />;
      case EquipSlot.Legs:
        return <Shield className="w-5 h-5 text-slate-500" />;
      case EquipSlot.Boots:
        return <Footprints className="w-5 h-5 text-slate-500" />;
      case EquipSlot.MainHand:
        return <Sword className="w-5 h-5 text-slate-500" />;
      case EquipSlot.OffHand:
        return <Shield className="w-5 h-5 text-slate-500" />;
      case EquipSlot.Ring:
        return <CircleDot className="w-5 h-5 text-slate-500" />;
      case EquipSlot.Amulet:
        return <Gem className="w-5 h-5 text-slate-500" />;
      default:
        return null;
    }
  };

  const getSlotName = (slot: EquipSlot): string => {
    switch (slot) {
      case EquipSlot.Head:
        return 'Head';
      case EquipSlot.Chest:
        return 'Chest';
      case EquipSlot.Legs:
        return 'Legs';
      case EquipSlot.Boots:
        return 'Boots';
      case EquipSlot.MainHand:
        return 'Main Hand';
      case EquipSlot.OffHand:
        return 'Off Hand';
      case EquipSlot.Ring:
        return 'Ring';
      case EquipSlot.Amulet:
        return 'Amulet';
      default:
        return 'Slot';
    }
  };

  const renderTooltip = () => {
    if (!hoveredStack) return null;
    const def = getItemDef(hoveredStack.itemDefId);
    if (!def) return null;

    const upg = hoveredStack.upgradeLevel || 0;
    const scaledMods = getScaledItemModifiers(def, upg);
    const equippedInSlot = def.slot !== EquipSlot.None ? equipment[def.slot] : null;
    const isComparing = equippedInSlot && equippedInSlot !== hoveredStack;
    const equippedDef = isComparing ? getItemDef(equippedInSlot.itemDefId) : null;
    const equippedMods =
      equippedDef && equippedInSlot
        ? getScaledItemModifiers(equippedDef, equippedInSlot.upgradeLevel || 0)
        : [];

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl w-68 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-cinzel font-bold text-sm text-slate-100">
            {def.name} {upg > 0 ? `+${upg}` : ''}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${getRarityBadgeColor(def.rarity)}`}>
            {getRarityName(def.rarity)}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mb-2">
          {def.slot !== EquipSlot.None ? getSlotName(def.slot) : 'Consumable'}
        </div>
        <p className="text-xs text-slate-300 italic mb-3">{def.description}</p>

        {scaledMods.length > 0 && (
          <div className="border-t border-slate-800 pt-2 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Item Properties:
            </span>
            {scaledMods.map((mod, idx) => (
              <div key={idx} className="text-xs text-emerald-400 font-medium">
                +{mod.value}
                {mod.op === 1 ? '%' : ''} {getStatName(mod.stat)}
              </div>
            ))}
          </div>
        )}

        {isComparing && equippedDef && (
          <div className="mt-3 pt-2 border-t border-slate-800 space-y-1">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
              Currently Equipped ({equippedDef.name}
              {equippedInSlot?.upgradeLevel ? ` +${equippedInSlot.upgradeLevel}` : ''}):
            </span>
            {equippedMods.map((mod, idx) => (
              <div key={idx} className="text-[11px] text-slate-400 font-mono">
                +{mod.value}
                {mod.op === 1 ? '%' : ''} {getStatName(mod.stat)}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
          {def.slot !== EquipSlot.None ? 'Click to equip/unequip' : 'Click to consume'}
        </div>
      </div>
    );
  };

  const equipmentSlots: EquipSlot[] = [
    EquipSlot.Head,
    EquipSlot.Amulet,
    EquipSlot.Chest,
    EquipSlot.MainHand,
    EquipSlot.OffHand,
    EquipSlot.Legs,
    EquipSlot.Ring,
    EquipSlot.Boots,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-w-2xl w-full flex flex-col md:flex-row gap-6">
        {/* Close Button */}
        <button
          id="close-inv-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Equipped Gear */}
        <div className="flex-1 flex flex-col items-center">
          <h3 className="font-cinzel text-lg font-bold text-amber-400 mb-3 tracking-wide">
            Equipped Gear
          </h3>

          <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
            {equipmentSlots.map((slot) => {
              const stack = equipment[slot];
              const def = stack ? getItemDef(stack.itemDefId) : null;
              const upg = stack?.upgradeLevel || 0;

              return (
                <div
                  key={slot}
                  id={`equip-slot-${slot}`}
                  onClick={() => {
                    if (stack) {
                      engine.unequipItem(slot);
                      setTick((t) => t + 1);
                    }
                  }}
                  onMouseEnter={() => stack && setHoveredStack(stack)}
                  onMouseLeave={() => setHoveredStack(null)}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center p-2 cursor-pointer transition-all relative ${
                    def
                      ? getRarityColor(def.rarity) + ' hover:scale-105'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {def ? (
                    <>
                      <span className="text-xs font-semibold truncate max-w-[105px]">
                        {def.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{getSlotName(slot)}</span>
                      {upg > 0 && (
                        <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-amber-300 bg-slate-950/80 px-1 rounded">
                          +{upg}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-600">
                      {getSlotIcon(slot)}
                      <span className="text-[9px] mt-1">{getSlotName(slot)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Bag Inventory */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3 pr-6">
            <h3 className="font-cinzel text-lg font-bold text-amber-400 tracking-wide">
              Adventurer's Bag
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSortBag}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition"
                title="Sort Bag by Rarity"
              >
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>Sort</span>
              </button>
              <span className="text-xs font-mono text-amber-300/90">
                Gold: {engine.state.playerStats.gold}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex-1">
            {inventory.map((stack, idx) => {
              const def = stack ? getItemDef(stack.itemDefId) : null;
              const upg = stack?.upgradeLevel || 0;

              return (
                <div
                  key={idx}
                  id={`inv-slot-${idx}`}
                  onClick={() => {
                    if (stack) {
                      engine.useItem(idx);
                      setTick((t) => t + 1);
                    }
                  }}
                  onMouseEnter={() => stack && setHoveredStack(stack)}
                  onMouseLeave={() => setHoveredStack(null)}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 relative cursor-pointer transition-transform ${
                    def
                      ? getRarityColor(def.rarity) + ' hover:scale-105 shadow'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {def && stack && (
                    <>
                      {def.id === 10 || def.id === 26 ? (
                        <Heart className="w-5 h-5 text-rose-400" />
                      ) : def.id === 11 || def.id === 27 || def.id === 14 ? (
                        <Sparkles className="w-5 h-5 text-sky-400" />
                      ) : (
                        <Sword className="w-5 h-5" />
                      )}
                      <span className="text-[10px] font-semibold text-center truncate w-full px-1">
                        {def.name}
                      </span>
                      {upg > 0 && (
                        <span className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-amber-300 bg-slate-950/80 px-1 rounded">
                          +{upg}
                        </span>
                      )}
                      {stack.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-slate-100 bg-slate-950/80 px-1 rounded">
                          x{stack.count}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tooltip Overlay */}
        <div className="hidden lg:block absolute left-full ml-4 top-6">
          {renderTooltip()}
        </div>
      </div>
    </div>
  );
};
