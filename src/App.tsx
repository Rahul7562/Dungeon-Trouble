import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './engine/gameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CharacterSheetModal } from './components/CharacterSheetModal';
import { CombatLog } from './components/CombatLog';
import { Minimap } from './components/Minimap';
import { VictoryDefeatModal } from './components/VictoryDefeatModal';
import { MainMenuModal } from './components/MainMenuModal';
import { ClassSelectModal } from './components/ClassSelectModal';
import {
  NPCModal,
  StorageModal,
  ShopModal,
  BlacksmithModal,
  DungeonPortalModal,
} from './components/TownModals';
import { CharacterClass } from './engine/types';
import { hasSavedCheckpoint } from './engine/checkpoint';
import { sound } from './engine/audio';
import { Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  // React state for HUD updates
  const [, setTick] = useState(0);
  const [isInMainMenu, setIsInMainMenu] = useState(true);
  const [isPausedMenu, setIsPausedMenu] = useState(false);
  const [showClassSelect, setShowClassSelect] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [activeTownModal, setActiveTownModal] = useState<
    'npc' | 'storage' | 'shop' | 'blacksmith' | 'portal' | null
  >(null);
  const [showHelpGuide, setShowHelpGuide] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingGuide, setIsDraggingGuide] = useState(false);
  const controlsGuideRef = useRef<HTMLElement | null>(null);
  const guideDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    currentX: number;
    currentY: number;
  }>({
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    originX: 16,
    originY: 80,
    currentX: 16,
    currentY: 80,
  });

  const handleGuidePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('#dismiss-guide-btn')) return;
    e.stopPropagation();

    const el = controlsGuideRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    guideDragRef.current.active = true;
    guideDragRef.current.pointerId = e.pointerId;
    guideDragRef.current.startClientX = e.clientX;
    guideDragRef.current.startClientY = e.clientY;
    guideDragRef.current.originX = rect.left;
    guideDragRef.current.originY = rect.top;
    guideDragRef.current.currentX = rect.left;
    guideDragRef.current.currentY = rect.top;

    setIsDraggingGuide(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors on synthetic events
    }
  };

  const handleGuidePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!guideDragRef.current.active) return;
    e.stopPropagation();

    const el = controlsGuideRef.current;
    if (!el) return;

    const dx = e.clientX - guideDragRef.current.startClientX;
    const dy = e.clientY - guideDragRef.current.startClientY;
    const maxX = Math.max(8, window.innerWidth - el.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - el.offsetHeight - 8);

    const nextX = Math.max(8, Math.min(maxX, guideDragRef.current.originX + dx));
    const nextY = Math.max(8, Math.min(maxY, guideDragRef.current.originY + dy));

    guideDragRef.current.currentX = nextX;
    guideDragRef.current.currentY = nextY;
    el.style.setProperty('--guide-x', `${Math.round(nextX)}px`);
    el.style.setProperty('--guide-y', `${Math.round(nextY)}px`);
  };

  const handleGuidePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!guideDragRef.current.active) return;
    e.stopPropagation();
    guideDragRef.current.active = false;
    guideDragRef.current.pointerId = null;
    setIsDraggingGuide(false);
    try {
      controlsGuideRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture release errors
    }
  };

  const isAnyModalOpen =
    isInMainMenu ||
    isPausedMenu ||
    showClassSelect ||
    showInventory ||
    showCharacterSheet ||
    activeTownModal !== null;

  useEffect(() => {
    engine.isPaused = isAnyModalOpen;
    if (isAnyModalOpen) {
      engine.clearInput();
    }
  }, [engine, isAnyModalOpen]);

  useEffect(() => {
    engine.onInteract = () => {
      if (engine.state.activeNPC) {
        setActiveTownModal('npc');
      }
    };
    engine.onInteractPortal = () => {
      setActiveTownModal('portal');
    };
  }, [engine]);

  const handleEngineTick = useCallback(() => {
    // Force re-render periodically for HUD numbers
    setTick((t) => (t + 1) % 10000);
  }, []);

  const handleToggleMute = () => {
    const nextState = !sound.isSoundEnabled();
    sound.toggleSound(nextState);
    setIsMuted(!nextState);
  };

  const handleOpenClassSelect = () => {
    setShowClassSelect(true);
  };

  const handleStartNewGame = (selectedClass: CharacterClass, playerName: string) => {
    engine.state = engine.initializeNewGame(selectedClass, playerName, true, 1);
    setIsInMainMenu(false);
    setIsPausedMenu(false);
    setShowClassSelect(false);
    setShowInventory(false);
    setShowCharacterSheet(false);
    setActiveTownModal(null);
    setShowHelpGuide(true);
    setTick((t) => (t + 1) % 10000);
  };

  const handleTryAgain = () => {
    const currentClass = engine.state.selectedClass || 'swordsman';
    const currentName = engine.state.playerName || 'Valerius';
    engine.state = engine.initializeNewGame(currentClass, currentName, true, 1);
    setIsInMainMenu(false);
    setIsPausedMenu(false);
    setShowClassSelect(false);
    setShowInventory(false);
    setShowCharacterSheet(false);
    setActiveTownModal(null);
    setShowHelpGuide(true);
    sound.playRespawn();
    setTick((t) => (t + 1) % 10000);
  };

  const handleResetGame = () => {
    handleOpenClassSelect();
  };

  const handleContinueGame = () => {
    const loaded = engine.loadCheckpointGame();
    if (loaded) {
      setIsInMainMenu(false);
      setIsPausedMenu(false);
      setShowClassSelect(false);
      setShowInventory(false);
      setShowCharacterSheet(false);
      setActiveTownModal(null);
      sound.playPortal();
      setTick((t) => (t + 1) % 10000);
    } else {
      handleOpenClassSelect();
    }
  };

  const handleQuitToMenu = () => {
    engine.autoSave();
    setIsInMainMenu(true);
    setIsPausedMenu(false);
    setShowClassSelect(false);
    setShowInventory(false);
    setShowCharacterSheet(false);
    setActiveTownModal(null);
    setTick((t) => (t + 1) % 10000);
  };

  // Global key bindings for UI
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isInMainMenu) return;
      const k = e.key.toLowerCase();
      if (k === 'i' || k === 'b') {
        setShowInventory((prev) => !prev);
      } else if (k === 'c') {
        setShowCharacterSheet((prev) => !prev);
      } else if (k === 'm') {
        handleToggleMute();
      } else if (k === 'h') {
        setShowHelpGuide((prev) => !prev);
      } else if (k === 'escape') {
        if (activeTownModal) {
          setActiveTownModal(null);
          return;
        }
        if (showClassSelect) {
          setShowClassSelect(false);
          return;
        }
        setShowInventory(false);
        setShowCharacterSheet(false);
        setShowHelpGuide(false);
        setIsPausedMenu((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isInMainMenu, activeTownModal, showClassSelect]);

  return (
    <main id="dungeon-trouble-app" className="relative w-full h-full overflow-hidden bg-slate-950 font-sans">
      {/* Main Menu Screen (Initial or Pause overlay) */}
      {(isInMainMenu || isPausedMenu) && (
        <MainMenuModal
          isPausedMode={!isInMainMenu && isPausedMenu}
          onResume={() => setIsPausedMenu(false)}
          onNewGame={handleResetGame}
          onContinue={handleContinueGame}
          onQuit={handleQuitToMenu}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 2.5D Isometric Canvas Engine */}
      <GameCanvas engine={engine} onEngineTick={handleEngineTick} />

      {/* Heads-Up Display (Health, Mana, XP, Skills, Quick Actions) */}
      <HUD
        engine={engine}
        onOpenInventory={() => setShowInventory(true)}
        onOpenCharacterSheet={() => setShowCharacterSheet(true)}
        onOpenMenu={() => setIsPausedMenu(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Minimap Radar */}
      <Minimap engine={engine} />

      {/* Chronicle / Combat Feed */}
      <CombatLog logs={engine.state.combatLogs} />

      {/* Beginner Guide Overlay Banner */}
      {!isInMainMenu && (
        <aside
          id="controls-guide"
          ref={controlsGuideRef}
          onPointerDown={handleGuidePointerDown}
          onPointerMove={handleGuidePointerMove}
          onPointerUp={handleGuidePointerUp}
          onPointerCancel={handleGuidePointerUp}
          className={`absolute z-20 max-w-xs rounded-xl p-4 text-xs ${
            showHelpGuide ? 'controls-guide-enter pointer-events-auto' : 'controls-guide-hidden'
          } ${isDraggingGuide ? 'controls-guide-dragging' : ''}`}
        >
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-amber-700/40">
            <div className="flex items-center gap-1.5 font-cinzel font-bold text-amber-300 tracking-wide">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Dungeon Delver Controls</span>
            </div>
            <button
              id="dismiss-guide-btn"
              onClick={() => setShowHelpGuide(false)}
              className="text-amber-200/70 hover:text-amber-100 p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px] text-amber-100/90 leading-relaxed">
            <li>
              <b className="text-amber-200 font-semibold">WASD / Arrow Keys</b>: Move Hero
            </li>
            <li>
              <b className="text-amber-200 font-semibold">Mouse</b>: Aim direction & weapon facing
            </li>
            <li>
              <b className="text-amber-200 font-semibold">Left Click / 1</b>: Twin Cleave
            </li>
            <li>
              <b className="text-amber-200 font-semibold">Right Click / 2 (Q)</b>: Inferno Burst
            </li>
            <li>
              <b className="text-amber-200 font-semibold">3 (E)</b>: Frost Nova (AoE Chill)
            </li>
            <li>
              <b className="text-amber-200 font-semibold">Space / 4</b>: Aether Dash
            </li>
            <li>
              <b className="text-amber-200 font-semibold">I / B</b>: Open Inventory & Gear
            </li>
            <li>
              <b className="text-amber-200 font-semibold">C</b>: Open Hero Sheet & Attributes
            </li>
          </ul>
        </aside>
      )}

      {/* Inventory Modal */}
      {showInventory && (
        <InventoryModal engine={engine} onClose={() => setShowInventory(false)} />
      )}

      {/* Character Sheet Modal */}
      {showCharacterSheet && (
        <CharacterSheetModal engine={engine} onClose={() => setShowCharacterSheet(false)} />
      )}

      {/* Class Selection & Character Name Modal */}
      {showClassSelect && (
        <ClassSelectModal
          initialPlayerName={engine.state.playerName || 'Valerius'}
          currentClass={engine.state.selectedClass || 'swordsman'}
          onSelectClass={handleStartNewGame}
          onClose={() => setShowClassSelect(false)}
          hasExistingSave={hasSavedCheckpoint()}
        />
      )}

      {/* Town NPC Modal */}
      {activeTownModal === 'npc' && engine.state.activeNPC && (
        <NPCModal
          engine={engine}
          npc={engine.state.activeNPC}
          onClose={() => setActiveTownModal(null)}
          onOpenFacility={(role) => {
            if (role === 'storage' || role === 'shop' || role === 'blacksmith' || role === 'portal') {
              setActiveTownModal(role);
            }
          }}
        />
      )}

      {/* Town Storage Facility Modal */}
      {activeTownModal === 'storage' && (
        <StorageModal engine={engine} onClose={() => setActiveTownModal(null)} />
      )}

      {/* Town Shop Vendor Modal */}
      {activeTownModal === 'shop' && (
        <ShopModal engine={engine} onClose={() => setActiveTownModal(null)} />
      )}

      {/* Town Blacksmith Upgrade Modal */}
      {activeTownModal === 'blacksmith' && (
        <BlacksmithModal engine={engine} onClose={() => setActiveTownModal(null)} />
      )}

      {/* Dungeon Portal Gateway Modal */}
      {activeTownModal === 'portal' && (
        <DungeonPortalModal
          engine={engine}
          onClose={() => setActiveTownModal(null)}
          onDelveToFloor={(floor) => {
            engine.transitionToZone('dungeon', floor);
            setActiveTownModal(null);
          }}
          onReturnToTown={() => {
            engine.transitionToZone('town', 1);
            setActiveTownModal(null);
          }}
        />
      )}

      {/* Game Over / Victory Modal */}
      {(engine.state.isGameOver || engine.state.isVictory) && !showClassSelect && !isInMainMenu && (
        <VictoryDefeatModal
          isVictory={engine.state.isVictory}
          onRestart={handleTryAgain}
          onSelectClass={handleOpenClassSelect}
          onMainMenu={handleQuitToMenu}
          level={engine.state.playerStats.level}
          gold={engine.state.playerStats.gold}
        />
      )}
    </main>
  );
};

export default App;
