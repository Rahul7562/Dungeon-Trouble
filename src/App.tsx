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
import { sound } from './engine/audio';
import { Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  // React state for HUD updates
  const [, setTick] = useState(0);
  const [isInMainMenu, setIsInMainMenu] = useState(true);
  const [isPausedMenu, setIsPausedMenu] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const isAnyModalOpen = isInMainMenu || isPausedMenu || showInventory || showCharacterSheet;

  useEffect(() => {
    engine.isPaused = isAnyModalOpen;
    if (isAnyModalOpen) {
      engine.clearInput();
    }
  }, [engine, isAnyModalOpen]);

  const handleEngineTick = useCallback(() => {
    // Force re-render periodically for HUD numbers
    setTick((t) => (t + 1) % 10000);
  }, []);

  const handleToggleMute = () => {
    const nextState = !sound.isSoundEnabled();
    sound.toggleSound(nextState);
    setIsMuted(!nextState);
  };

  const handleResetGame = () => {
    engine.state = engine.initializeNewGame(1);
    setIsInMainMenu(false);
    setIsPausedMenu(false);
    setShowInventory(false);
    setShowCharacterSheet(false);
  };

  const handleContinueGame = () => {
    const loaded = engine.loadCheckpointGame();
    if (loaded) {
      setIsInMainMenu(false);
      setIsPausedMenu(false);
      setShowInventory(false);
      setShowCharacterSheet(false);
    } else {
      handleResetGame();
    }
  };

  const handleQuitToMenu = () => {
    setIsInMainMenu(true);
    setIsPausedMenu(false);
    setShowInventory(false);
    setShowCharacterSheet(false);
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
      } else if (k === 'escape') {
        setShowInventory(false);
        setShowCharacterSheet(false);
        setShowHelpGuide(false);
        setIsPausedMenu((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isInMainMenu]);

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
      {showHelpGuide && !isInMainMenu && (
        <aside
          id="controls-guide"
          className="pointer-events-auto absolute top-20 left-4 z-20 max-w-xs bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-xs text-slate-300"
        >
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-cinzel font-bold text-amber-400">
              <Info className="w-4 h-4" />
              <span>Dungeon Delver Controls</span>
            </div>
            <button
              id="dismiss-guide-btn"
              onClick={() => setShowHelpGuide(false)}
              className="text-slate-400 hover:text-slate-100 p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <b className="text-slate-100">WASD / Arrow Keys</b>: Move Hero
            </li>
            <li>
              <b className="text-slate-100">Mouse</b>: Aim direction & weapon facing
            </li>
            <li>
              <b className="text-slate-100">Left Click / 1</b>: Twin Cleave
            </li>
            <li>
              <b className="text-slate-100">Right Click / 2 (Q)</b>: Inferno Burst
            </li>
            <li>
              <b className="text-slate-100">3 (E)</b>: Frost Nova (AoE Chill)
            </li>
            <li>
              <b className="text-slate-100">Space / 4</b>: Aether Dash
            </li>
            <li>
              <b className="text-slate-100">I / B</b>: Open Inventory & Gear
            </li>
            <li>
              <b className="text-slate-100">C</b>: Open Hero Sheet & Attributes
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

      {/* Game Over / Victory Modal */}
      {(engine.state.isGameOver || engine.state.isVictory) && (
        <VictoryDefeatModal
          isVictory={engine.state.isVictory}
          onRestart={handleResetGame}
          level={engine.state.playerStats.level}
          gold={engine.state.playerStats.gold}
        />
      )}
    </main>
  );
};

export default App;
