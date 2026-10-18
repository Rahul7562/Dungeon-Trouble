import React, { useState } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { NPCEntity, ItemStack, EquipSlot, ItemRarity, StatType } from '../engine/types';
import {
  getItemDef,
  getRarityBadgeColor,
  getRarityName,
  createItemStack,
  getScaledItemModifiers,
} from '../engine/items';
import { getStatName } from '../engine/stats';
import { sound } from '../engine/audio';
import {
  X,
  Heart,
  Sparkles,
  Shield,
  Sword,
  Coins,
  ArrowRightLeft,
  Hammer,
  DoorOpen,
  Check,
  Flame,
  ArrowUpCircle,
  HelpCircle,
} from 'lucide-react';

/* =========================================================================
   1. NPC Dialogue & Healer Modal
   ========================================================================= */
interface NPCModalProps {
  engine: GameEngine;
  npc: NPCEntity;
  onClose: () => void;
  onOpenFacility?: (role: string) => void;
}

export const NPCModal: React.FC<NPCModalProps> = ({
  engine,
  npc,
  onClose,
  onOpenFacility,
}) => {
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [healed, setHealed] = useState(false);

  const playerName = engine.state.playerName || 'Hero';
  const playerClass = engine.state.selectedClass || 'swordsman';

  const rawLine = npc.dialogue[dialogueIdx] || npc.dialogue[0];
  const renderedLine = rawLine
    .replace('{PLAYERNAME}', playerName)
    .replace('{CLASS}', playerClass.toUpperCase());

  const handleHeal = () => {
    engine.healPlayerFull();
    setHealed(true);
    sound.playLevelUp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* NPC Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg font-cinzel shadow-inner"
            style={{ backgroundColor: `${npc.color}25`, color: npc.color }}
          >
            {npc.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-cinzel text-lg font-bold text-slate-100">{npc.name}</h3>
            <span className="text-xs text-amber-400 font-medium">{npc.title}</span>
          </div>
        </div>

        {/* Dialogue Body */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 min-h-[90px] flex items-center">
          <p className="text-sm text-slate-200 leading-relaxed italic">
            "{renderedLine}"
          </p>
        </div>

        {/* Facility Specific Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Multi-dialogue next button */}
          {npc.dialogue.length > 1 && (
            <button
              onClick={() => setDialogueIdx((prev) => (prev + 1) % npc.dialogue.length)}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
            >
              Next Advice ({dialogueIdx + 1}/{npc.dialogue.length})
            </button>
          )}

          {/* Healer Action */}
          {npc.role === 'healer' && (
            <button
              onClick={handleHeal}
              disabled={healed}
              className={`py-2 px-5 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 transition ${
                healed
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/40 active:scale-95'
              }`}
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>{healed ? 'Blessed & Fully Restored!' : 'Receive Healing (Free)'}</span>
            </button>
          )}

          {/* Open specialized facility */}
          {npc.role === 'storage' && onOpenFacility && (
            <button
              onClick={() => onOpenFacility('storage')}
              className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-bold text-xs shadow-lg transition active:scale-95"
            >
              Open Town Vault
            </button>
          )}

          {npc.role === 'shop' && onOpenFacility && (
            <button
              onClick={() => onOpenFacility('shop')}
              className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-bold text-xs shadow-lg transition active:scale-95"
            >
              Browse Merchant Goods
            </button>
          )}

          {npc.role === 'blacksmith' && onOpenFacility && (
            <button
              onClick={() => onOpenFacility('blacksmith')}
              className="py-2 px-5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-cinzel font-bold text-xs shadow-lg transition active:scale-95"
            >
              Enter Forge & Upgrade
            </button>
          )}

          {npc.role === 'guide' && onOpenFacility && (
            <button
              onClick={() => onOpenFacility('portal')}
              className="py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-cinzel font-bold text-xs shadow-lg transition active:scale-95"
            >
              Step into Dungeon Portal
            </button>
          )}

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs transition ml-auto"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. Town Storage Vault Modal (Brom the Keeper)
   ========================================================================= */
interface StorageModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const StorageModal: React.FC<StorageModalProps> = ({ engine, onClose }) => {
  const { inventory, storage } = engine.state;
  const [, setTick] = useState(0);

  const handleDeposit = (slotIdx: number) => {
    const item = inventory[slotIdx];
    if (!item) return;

    // Find first empty storage slot
    const emptySlot = storage.findIndex((s: ItemStack | null) => s === null);
    if (emptySlot === -1) {
      engine.addCombatLog('Storage vault is full!', 'system');
      return;
    }

    storage[emptySlot] = { ...item };
    inventory[slotIdx] = null;
    sound.playLootDrop();
    engine.autoSave();
    setTick((t) => t + 1);
  };

  const handleWithdraw = (slotIdx: number) => {
    const item = storage[slotIdx];
    if (!item) return;

    // Find first empty inventory slot
    const emptySlot = inventory.findIndex((s: ItemStack | null) => s === null);
    if (emptySlot === -1) {
      engine.addCombatLog('Your inventory is full!', 'system');
      return;
    }

    inventory[emptySlot] = { ...item };
    storage[slotIdx] = null;
    sound.playLootDrop();
    engine.autoSave();
    setTick((t) => t + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="font-cinzel text-xl font-bold text-amber-400">Town Vault Stash</h2>
            <p className="text-xs text-slate-400">
              Deposit loot securely with Brom. Stored items persist forever across saves and delves.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Grid: Storage Vault (Left) & Player Inventory (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage Stash */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 text-xs font-cinzel font-bold text-amber-300 uppercase tracking-wider">
              <span>Vault Repository ({storage.filter(Boolean).length}/24)</span>
              <span className="text-[10px] font-mono text-slate-500">Click to Withdraw</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {storage.map((slot: ItemStack | null, idx: number) => {
                const def = slot ? getItemDef(slot.itemDefId) : null;
                return (
                  <button
                    key={idx}
                    onClick={() => handleWithdraw(idx)}
                    disabled={!slot}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center relative transition-all ${
                      slot
                        ? 'bg-slate-850 border-slate-700 hover:border-amber-400 hover:bg-slate-800 cursor-pointer active:scale-95'
                        : 'bg-slate-900/40 border-slate-800/80 cursor-default'
                    }`}
                    title={def ? `${def.name} (Click to Withdraw)` : 'Empty Vault Slot'}
                  >
                    {def && (
                      <>
                        <span className="text-xs font-semibold text-slate-200 text-center px-1 truncate w-full">
                          {def.name}
                        </span>
                        {slot!.count > 1 && (
                          <span className="absolute bottom-1 right-1.5 text-[10px] font-mono font-bold text-amber-400">
                            x{slot!.count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Inventory */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 text-xs font-cinzel font-bold text-slate-300 uppercase tracking-wider">
              <span>Player Pack ({inventory.filter(Boolean).length}/20)</span>
              <span className="text-[10px] font-mono text-slate-500">Click to Deposit</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {inventory.map((slot, idx) => {
                const def = slot ? getItemDef(slot.itemDefId) : null;
                return (
                  <button
                    key={idx}
                    onClick={() => handleDeposit(idx)}
                    disabled={!slot}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center relative transition-all ${
                      slot
                        ? 'bg-slate-850 border-slate-700 hover:border-sky-400 hover:bg-slate-800 cursor-pointer active:scale-95'
                        : 'bg-slate-900/40 border-slate-800/80 cursor-default'
                    }`}
                    title={def ? `${def.name} (Click to Deposit)` : 'Empty Bag Slot'}
                  >
                    {def && (
                      <>
                        <span className="text-xs font-semibold text-slate-200 text-center px-1 truncate w-full">
                          {def.name}
                        </span>
                        {slot!.count > 1 && (
                          <span className="absolute bottom-1 right-1.5 text-[10px] font-mono font-bold text-amber-400">
                            x{slot!.count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-cinzel font-bold transition"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. Merchant Shop Modal (Garrick the Merchant)
   ========================================================================= */
interface ShopModalProps {
  engine: GameEngine;
  onClose: () => void;
}

interface ShopItem {
  id: number;
  price: number;
}

const MERCHANT_WARES: ShopItem[] = [
  { id: 10, price: 25 }, // Health Elixir
  { id: 11, price: 20 }, // Mana Flask
  { id: 14, price: 45 }, // Elixir of Regeneration
  { id: 26, price: 60 }, // Greater Health Potion
  { id: 27, price: 50 }, // Greater Mana Flask
  { id: 18, price: 120 }, // Steel Broadsword
  { id: 19, price: 90 }, // Ranger's Quiver
  { id: 20, price: 110 }, // Spell Tome of Sparks
  { id: 21, price: 100 }, // Skull of the Fallen
  { id: 33, price: 95 }, // Iron Vanguard Helm
  { id: 34, price: 155 }, // Circlet of Arcane Focus
  { id: 22, price: 180 }, // Knight's Plate Mail
  { id: 23, price: 140 }, // Hunter's Leather Tunic
  { id: 24, price: 150 }, // Silk Robes of the Magus
  { id: 36, price: 135 }, // Stalker's Shadow Leggings
  { id: 38, price: 145 }, // Windrunner Greaves
  { id: 28, price: 250 }, // Ring of the Dungeon Master
  { id: 29, price: 300 }, // Amulet of the Ancients
];

export const ShopModal: React.FC<ShopModalProps> = ({ engine, onClose }) => {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [, setTick] = useState(0);

  const gold = engine.state.playerStats.gold;

  const handleBuy = (item: ShopItem) => {
    if (gold < item.price) {
      engine.addCombatLog('Not enough gold to purchase this item!', 'system');
      return;
    }

    const emptyIdx = engine.state.inventory.findIndex((s) => s === null);
    if (emptyIdx === -1) {
      engine.addCombatLog('Your inventory is full!', 'system');
      return;
    }

    engine.state.playerStats.gold -= item.price;
    engine.state.inventory[emptyIdx] = createItemStack(item.id, 1);
    sound.playLootDrop();
    engine.addCombatLog(`Purchased ${getItemDef(item.id)?.name} for ${item.price} Gold.`, 'loot');
    engine.autoSave();
    setTick((t) => t + 1);
  };

  const handleSell = (slotIdx: number) => {
    const slot = engine.state.inventory[slotIdx];
    if (!slot) return;
    const def = getItemDef(slot.itemDefId);
    if (!def) return;

    const rarityVal = def.rarity ?? ItemRarity.Common;
    const sellValue = Math.max(10, Math.round((rarityVal + 1) * 20 * slot.count));
    engine.state.playerStats.gold += sellValue;
    engine.state.inventory[slotIdx] = null;
    sound.playLootDrop();
    engine.addCombatLog(`Sold ${def.name} for ${sellValue} Gold.`, 'loot');
    engine.autoSave();
    setTick((t) => t + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-cinzel text-xl font-bold text-amber-400">Garrick's Bazaar</h2>
              <p className="text-xs text-slate-400">
                Purchase quality arms, shields, and potions, or sell delve trophies for gold.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{gold} Gold</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('buy')}
            className={`py-2 px-6 rounded-xl font-cinzel font-bold text-xs transition ${
              tab === 'buy'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            Buy Goods
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`py-2 px-6 rounded-xl font-cinzel font-bold text-xs transition ${
              tab === 'sell'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            Sell Delve Loot
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'buy' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-96 pr-1">
            {MERCHANT_WARES.map((item) => {
              const def = getItemDef(item.id);
              if (!def) return null;
              const canAfford = gold >= item.price;
              return (
                <div
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-xs font-bold text-slate-100">
                        {def.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${getRarityBadgeColor(
                          def.rarity
                        )}`}
                      >
                        {getRarityName(def.rarity)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {def.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 shrink-0 transition ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>{item.price}g</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-96 pr-1">
            {engine.state.inventory.map((slot, idx) => {
              if (!slot) return null;
              const def = getItemDef(slot.itemDefId);
              if (!def) return null;
              const rarityVal = def.rarity ?? ItemRarity.Common;
              const sellValue = Math.max(10, Math.round((rarityVal + 1) * 20 * slot.count));
              return (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-xs font-bold text-slate-100">
                        {def.name} {slot.count > 1 && `(x${slot.count})`}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${getRarityBadgeColor(
                          def.rarity
                        )}`}
                      >
                        {getRarityName(def.rarity)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {def.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSell(idx)}
                    className="py-1.5 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 shrink-0 transition active:scale-95"
                  >
                    <span>+{sellValue}g</span>
                  </button>
                </div>
              );
            })}
            {engine.state.inventory.every((s) => s === null) && (
              <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                Your inventory is empty. Slay monsters in the dungeon to bring back loot!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   4. Blacksmith Upgrade Forge Modal (Torvald)
   ========================================================================= */
interface BlacksmithModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const BlacksmithModal: React.FC<BlacksmithModalProps> = ({ engine, onClose }) => {
  const [selectedSlotKey, setSelectedSlotKey] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const gold = engine.state.playerStats.gold;

  // Collect all upgradable equipment items across all 8 slots
  const itemsList: { key: number; name: string; item: ItemStack; slotLabel: string }[] = [];
  const eq = engine.state.equipment;

  const checkEquip = (slot: EquipSlot, label: string) => {
    if (eq[slot]) {
      const def = getItemDef(eq[slot]!.itemDefId);
      if (def) {
        itemsList.push({
          key: slot,
          name: def.name,
          item: eq[slot]!,
          slotLabel: label,
        });
      }
    }
  };

  checkEquip(EquipSlot.MainHand, 'Main Hand');
  checkEquip(EquipSlot.OffHand, 'Off Hand');
  checkEquip(EquipSlot.Head, 'Head');
  checkEquip(EquipSlot.Chest, 'Armor');
  checkEquip(EquipSlot.Legs, 'Legs');
  checkEquip(EquipSlot.Boots, 'Boots');
  checkEquip(EquipSlot.Ring, 'Ring');
  checkEquip(EquipSlot.Amulet, 'Amulet');

  const activeItem = itemsList.find((i) => i.key === selectedSlotKey) || itemsList[0];
  const activeDef = activeItem ? getItemDef(activeItem.item.itemDefId) : null;
  const currentUpgrade = activeItem?.item.upgradeLevel || 0;

  const upgradeCost = 80 + currentUpgrade * 45;
  const canAfford = gold >= upgradeCost;

  const currentMods = activeDef ? getScaledItemModifiers(activeDef, currentUpgrade) : [];
  const nextMods = activeDef ? getScaledItemModifiers(activeDef, currentUpgrade + 1) : [];

  const handleUpgrade = () => {
    if (!activeItem || !canAfford) return;
    engine.state.playerStats.gold -= upgradeCost;
    engine.upgradeEquipmentItem(activeItem.key as EquipSlot);
    sound.playLevelUp();
    engine.autoSave();
    setTick((t) => t + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-3xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-orange-400">Torvald's Anvil</h2>
              <p className="text-xs text-slate-400">
                Enhance equipped weapons and armor to boost damage and survivability.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span>{gold}g</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Item Selector */}
        {itemsList.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {itemsList.map((entry) => {
                const upg = entry.item.upgradeLevel || 0;
                return (
                  <button
                    key={entry.key}
                    onClick={() => setSelectedSlotKey(entry.key)}
                    className={`p-3 rounded-xl border text-left transition ${
                      activeItem.key === entry.key
                        ? 'bg-orange-500/15 border-orange-400 shadow'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">{entry.slotLabel}</span>
                      {upg > 0 && (
                        <span className="text-[10px] font-mono font-bold text-amber-400">+{upg}</span>
                      )}
                    </div>
                    <div className="font-cinzel text-xs font-bold text-slate-200 truncate mt-0.5">
                      {entry.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Upgrade Preview Panel */}
            {activeDef && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="font-cinzel font-bold text-slate-100 text-sm">
                    {activeDef.name} {currentUpgrade > 0 ? `+${currentUpgrade}` : ''} → +{currentUpgrade + 1}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">+15% Stats Tier</span>
                </div>
                <p className="text-xs text-slate-400 italic mb-4">{activeDef.description}</p>

                <div className="space-y-1.5 mb-5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Reforged Properties:
                  </div>
                  {currentMods.map((mod, idx) => {
                    const nextVal = nextMods[idx]?.value ?? Math.round(mod.value * 1.15 + 2);
                    return (
                      <div key={idx} className="text-xs text-emerald-400 font-mono">
                        • {getStatName(mod.stat)}: +{mod.value}
                        {mod.op === 1 ? '%' : ''} →{' '}
                        <span className="text-amber-300 font-bold">
                          +{nextVal}
                          {mod.op === 1 ? '%' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span>Upgrade Fee:</span>
                    <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {upgradeCost} Gold
                    </span>
                  </div>
                  <button
                    onClick={handleUpgrade}
                    disabled={!canAfford}
                    className={`py-2.5 px-6 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 shadow-lg transition ${
                      canAfford
                        ? 'bg-orange-500 hover:bg-orange-400 text-slate-950 active:scale-95'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Hammer className="w-4 h-4" />
                    <span>Reforge Gear (+{currentUpgrade + 1})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            You do not have any weapons or armor equipped to upgrade!
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   5. Dungeon Portal & Waypoint Modal
   ========================================================================= */
interface DungeonPortalModalProps {
  engine: GameEngine;
  onClose: () => void;
  onDelveToFloor: (floor: number) => void;
  onReturnToTown: () => void;
}

export const DungeonPortalModal: React.FC<DungeonPortalModalProps> = ({
  engine,
  onClose,
  onDelveToFloor,
  onReturnToTown,
}) => {
  const currentFloor = engine.state.currentFloor;
  const highestUnlocked = engine.state.highestFloorUnlocked || 1;
  const isCurrentlyInTown = engine.state.currentZone === 'town';

  const floorThemes = [
    { floor: 1, title: 'Crypt Outskirts', danger: 'Low', boss: 'None' },
    { floor: 2, title: 'Ossuary Chambers', danger: 'Moderate', boss: 'Skeletal Champion' },
    { floor: 3, title: 'Sepulcher of Bones', danger: 'HIGH', boss: 'Mortis the Undying (BOSS 1)' },
    { floor: 4, title: 'Sunken Catacombs', danger: 'High', boss: 'Catacomb Defiler' },
    { floor: 5, title: 'Drowned Labyrinth', danger: 'Severe', boss: 'Sunken Dreadnought' },
    { floor: 6, title: 'The Void Sanctum', danger: 'EXTREME', boss: 'Malakor the Void Weaver (BOSS 2)' },
    { floor: 7, title: 'Infernal Threshold', danger: 'Extreme', boss: 'Magma Brute' },
    { floor: 8, title: 'Abyssal Caldron', danger: 'Nightmare', boss: 'Abyssal Pyroclast' },
    { floor: 9, title: 'Halls of Shadow', danger: 'Nightmare', boss: 'Shadow Archon' },
    { floor: 10, title: 'Heart of the Cataclysm', danger: 'FATAL', boss: 'Ignis Rex - FINAL BOSS' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-800/80 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="font-cinzel text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-amber-300">
              {isCurrentlyInTown ? 'Dungeon Gateway of Ruin' : `Floor ${currentFloor} Portal`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCurrentlyInTown
                ? 'Select an unlocked floor to delve into the 10-floor labyrinth.'
                : 'Defeat the floor boss to advance, or return to Town-1 to restock.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Floor Selection Grid (1 to 10) */}
        <div className="space-y-2 mb-6">
          {floorThemes.map((theme) => {
            const isUnlocked = theme.floor <= highestUnlocked;
            const isCurrent = !isCurrentlyInTown && theme.floor === currentFloor;
            const isBossFloor = theme.floor === 3 || theme.floor === 6 || theme.floor === 10;

            return (
              <button
                key={theme.floor}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    onDelveToFloor(theme.floor);
                  }
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-purple-950/70 border-purple-500 ring-1 ring-purple-400'
                    : isUnlocked
                    ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500 hover:bg-slate-850 cursor-pointer active:scale-99'
                    : 'bg-slate-950/40 border-slate-900 opacity-45 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-cinzel font-bold text-sm ${
                      isBossFloor
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    F{theme.floor}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-xs font-bold text-slate-100">
                        {theme.title}
                      </span>
                      {isBossFloor && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                          BOSS
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Guardian: {theme.boss}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold font-mono ${
                      theme.danger === 'FATAL' || theme.danger === 'Nightmare'
                        ? 'text-rose-400'
                        : theme.danger === 'HIGH' || theme.danger === 'EXTREME'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isUnlocked ? theme.danger : 'Locked'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          {!isCurrentlyInTown && (
            <button
              onClick={onReturnToTown}
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-cinzel font-bold text-xs shadow-lg transition active:scale-95"
            >
              Return to Town-1 (Safe)
            </button>
          )}

          {isCurrentlyInTown && (
            <button
              onClick={() => onDelveToFloor(1)}
              className="py-3 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-cinzel font-bold text-xs shadow-lg transition active:scale-95 ml-auto"
            >
              Enter Dungeon Floor 1
            </button>
          )}

          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
