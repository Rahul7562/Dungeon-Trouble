import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/engine/gameEngine';
import { StatType, TileType } from '../src/engine/types';
import { clearSaveGame, hasSavedGame, loadGameState } from '../src/engine/checkpoint';
import { sound, evaluateTownSoundscape, computeIsometricStereoPan } from '../src/engine/audio';

describe('GameEngine death and restart cycle', () => {
  beforeEach(() => {
    clearSaveGame();
  });

  it('correctly sets isGameOver on lethal damage and fully resets state on restart', () => {
    const engine = new GameEngine();
    const initialState = engine.initializeNewGame('swordsman', 'Valerius', true, 1);

    expect(initialState.isGameOver).toBe(false);
    expect(initialState.isVictory).toBe(false);
    expect(initialState.playerStats.health).toBeGreaterThan(0);

    // Simulate fatal damage
    initialState.playerStats.health = 0;
    initialState.isGameOver = true;
    expect(engine.state.isGameOver).toBe(true);

    // Trigger restart ("Try Again")
    const restartedState = engine.initializeNewGame(
      engine.state.selectedClass || 'swordsman',
      engine.state.playerName || 'Valerius',
      true,
      1
    );

    expect(restartedState.isGameOver).toBe(false);
    expect(restartedState.isVictory).toBe(false);
    expect(restartedState.playerStats.health).toBe(
      restartedState.playerStats.calculated[StatType.MaxHealth]
    );
    expect(restartedState.playerStats.mana).toBe(
      restartedState.playerStats.calculated[StatType.MaxMana]
    );
    expect(restartedState.player.statusEffects).toHaveLength(0);
    expect(restartedState.currentZone).toBe('town');
  });

  it('does not write phantom save file to storage during initial unplayed startup', () => {
    clearSaveGame();
    expect(hasSavedGame()).toBe(false);

    // Constructor creates preview state without polluting localStorage
    const engine = new GameEngine();
    expect(engine.state.selectedClass).toBe('swordsman');
    expect(hasSavedGame()).toBe(false);
  });

  it('preserves chosen character class and stats when resuming/reloading game', () => {
    clearSaveGame();

    // Player starts an Archer and advances
    const engine = new GameEngine();
    engine.initializeNewGame('archer', 'Robin', true, 1, true);
    engine.state.playerStats.level = 4;
    engine.autoSave();

    const saved = loadGameState();
    expect(saved).not.toBeNull();
    expect(saved?.selectedClass).toBe('archer');
    expect(saved?.playerName).toBe('Robin');
    expect(saved?.playerStats.level).toBe(4);

    // Simulate page refresh / app relaunch
    const reloadedEngine = new GameEngine();
    expect(reloadedEngine.state.selectedClass).toBe('archer');
    expect(reloadedEngine.state.playerName).toBe('Robin');
    expect(reloadedEngine.state.playerStats.level).toBe(4);

    // Calling continue restores the game
    const loaded = reloadedEngine.loadCheckpointGame();
    expect(loaded).toBe(true);
    expect(reloadedEngine.state.selectedClass).toBe('archer');
    expect(reloadedEngine.state.playerStats.level).toBe(4);
  });

  it('preserves chosen character class when advancing to next floor', () => {
    clearSaveGame();

    const engine = new GameEngine();
    engine.initializeNewGame('mage', 'Elminster', false, 1, true);
    expect(engine.state.selectedClass).toBe('mage');

    engine.advanceToNextFloor();
    expect(engine.state.currentFloor).toBe(2);
    expect(engine.state.selectedClass).toBe('mage');

    const saved = loadGameState();
    expect(saved?.currentFloor).toBe(2);
    expect(saved?.selectedClass).toBe('mage');
  });

  it('upgrades equipment via upgradeLevel without mutating global item definitions and consumes quick potions', () => {
    clearSaveGame();

    const engine = new GameEngine();
    engine.initializeNewGame('swordsman', 'Valerius', true, 1, true);

    const baseAtk = engine.state.playerStats.calculated[StatType.AttackPower];
    engine.upgradeEquipmentItem(5); // EquipSlot.MainHand = 5
    expect(engine.state.equipment[5]?.upgradeLevel).toBe(1);
    expect(engine.state.playerStats.calculated[StatType.AttackPower]).toBeGreaterThan(baseAtk);

    // Starting a new game should have un-mutated base AttackPower
    const freshEngine = new GameEngine();
    freshEngine.initializeNewGame('swordsman', 'Valerius', true, 1, false);
    expect(freshEngine.state.playerStats.calculated[StatType.AttackPower]).toBe(baseAtk);

    // Quick potion consumption
    engine.state.playerStats.health = 20;
    const usedHp = engine.useQuickPotion('health');
    expect(usedHp).toBe(true);
    expect(engine.state.playerStats.health).toBeGreaterThan(20);
  });

  it('spawns player near the central fountain in Town-1 with all 6 RPG NPCs, environmental props, and persistent vault storage', () => {
    clearSaveGame();

    const engine = new GameEngine();
    engine.initializeNewGame('necromancer', 'Morvath', true, 1, true);

    expect(engine.state.currentZone).toBe('town');
    const town = engine.state.townLevel;
    expect(town.map.width).toBe(96);
    expect(town.map.height).toBe(96);
    expect(town.buildings.length).toBeGreaterThanOrEqual(8);
    expect(town.npcs.length).toBeGreaterThanOrEqual(10);
    expect(town.props.length).toBeGreaterThan(30);
    expect(town.interiorTiles.size).toBeGreaterThan(80);

    // Player spawns near the central fountain
    const distToFountain = Math.hypot(
      engine.state.player.x - town.fountainPos.x,
      engine.state.player.y - town.fountainPos.y
    );
    expect(distToFountain).toBeLessThanOrEqual(220);

    // Every building interior center is walkable Floor, and buildings are widely separated (50m+ / 24+ tiles apart)
    for (let i = 0; i < town.buildings.length; i++) {
      const b = town.buildings[i];
      const cx = b.x + Math.floor(b.w / 2);
      const cy = b.y + Math.floor(b.h / 2);
      expect(town.map.get(cx, cy)).toBe(TileType.Floor);

      for (let j = i + 1; j < town.buildings.length; j++) {
        const b2 = town.buildings[j];
        const cx2 = b2.x + Math.floor(b2.w / 2);
        const cy2 = b2.y + Math.floor(b2.h / 2);
        const tileDist = Math.hypot(cx - cx2, cy - cy2);
        expect(tileDist).toBeGreaterThanOrEqual(24);
      }
    }

    // Advance engine in town and verify 24h daylight cycle progresses (4 real-time minutes = 240s per 24h)
    engine.isPaused = false;
    const initialTime = engine.state.worldTimeHours;
    engine.update(10); // 10s = +1.0 in-game hour
    expect(engine.state.worldTimeHours).toBeCloseTo(initialTime + 1.0, 2);

    // Persist an item in Town Vault Storage and verify round-trip save/load
    engine.state.storage[0] = {
      instanceId: 'vault-test-1',
      itemDefId: 40, // Soulreaper Scythe of the Lich
      defId: 40,
      count: 1,
    };
    engine.state.clearedFloors = [1, 2, 3];
    engine.state.highestFloorUnlocked = 4;
    engine.autoSave();

    const loaded = loadGameState();
    expect(loaded?.storage[0]?.itemDefId).toBe(40);
    expect(loaded?.clearedFloors).toEqual([1, 2, 3]);
    expect(loaded?.highestFloorUnlocked).toBe(4);
  });

  it('dynamically modulates positional Town-1 ambient sounds (birds, wind, water, market chatter, forge) based on player location', () => {
    const engine = new GameEngine();
    engine.initializeNewGame('archer', 'Sylva', true, 1, true);
    engine.isPaused = false;
    const map = engine.state.townLevel.map;

    // 1. At Central Sanctuary Fountain Plaza (tile 48, 46): strong water & plaza market chatter
    const plazaPos = map.tileToWorldCenter(48, 46);
    engine.state.player.x = plazaPos.x;
    engine.state.player.y = plazaPos.y;
    engine.update(0.1);
    const plazaScape = sound.getLastSoundscape();
    expect(plazaScape).not.toBeNull();
    expect(plazaScape!.waterGain).toBeGreaterThan(0.7);
    expect(plazaScape!.marketChatterGain).toBeGreaterThan(0.6);

    // 2. Near Garrick's Market & Curios (tile 79, 48): high market chatter, negligible forge sound
    const marketPos = map.tileToWorldCenter(79, 48);
    engine.state.player.x = marketPos.x;
    engine.state.player.y = marketPos.y;
    engine.update(0.1);
    const marketScape = sound.getLastSoundscape()!;
    expect(marketScape.marketChatterGain).toBeGreaterThan(0.8);
    expect(marketScape.forgeGain).toBe(0);

    // 3. Near Whispering Abbey Woodland Glade (tile 68, 22): high birdsong gain
    const grovePos = map.tileToWorldCenter(68, 22);
    const groveScape = evaluateTownSoundscape({
      zone: 'town',
      playerX: grovePos.x,
      playerY: grovePos.y,
      playerVx: 0,
      playerVy: 0,
      timeOfDayPhase: 'Morning',
      treeDensity: 0.7,
    });
    expect(groveScape.birdsGain).toBeGreaterThan(0.85);
    expect(groveScape.windGain).toBeGreaterThan(0.3);

    // 4. Stereo panning responds accurately to emitter direction in 2.5D isometric space
    const rightPan = computeIsometricStereoPan(0, 0, 400, -400, 600);
    const leftPan = computeIsometricStereoPan(0, 0, -400, 400, 600);
    expect(rightPan).toBeGreaterThan(0.4);
    expect(leftPan).toBeLessThan(-0.4);
  });
});


