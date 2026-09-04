# AGENTS.md — Dungeon-Trouble

## Project Overview
DungeonTrouble is a 2.5D isometric dungeon-crawler action RPG built with TypeScript, React 18, Vite, and HTML5 Canvas.

## Build & Test System
- TypeScript 5.7+, React 18, Vite 6, Tailwind CSS
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: Vitest in `tests/` — run via `npm test`

## Architecture & Standards
- Authoritative TypeScript implementation of all engine modules:
  - `src/engine/ecs.ts`: Generation-based Entity Component System with Views and CommandBuffer
  - `src/engine/events.ts`: Multi-channel EventBus, EventDispatcher, and Queued dispatch
  - `src/engine/simulation.ts`: Fixed-tick SimulationClock (30Hz), SystemScheduler, and deterministic SimulationLoop
  - `src/engine/math.ts`: Vector2, Vector3, Color, Collision, MathUtils
  - `src/engine/stats.ts`: StatSheet, StatModifiers (Flat, PercentAdd, PercentMult), StatCalculator
  - `src/engine/combat.ts`: DamagePipeline, HitQuery, CombatSystem
  - `src/engine/items.ts`: ItemDefTable, Inventory, Equipment, EquipmentOps, Result<T>
  - `src/engine/loot.ts`: LootTableDefTable, LootRoller, LootSystem, drop mechanics
  - `src/engine/abilities.ts`: AbilityDefTable, StatusEffectSystem, AbilitySystem
  - `src/engine/world.ts`: TileMap, ZoneRegistry, ZoneLoader, spawn points
  - `src/engine/renderer.ts`: 2.5D isometric renderer with lighting, particle systems, loot pillars
  - `src/engine/gameEngine.ts`: Unified game coordinator and simulation driver
- Modularity: Keep engine systems decoupled and thoroughly tested.
- Error handling: Use `Result<T>` pattern for operations that can fail without throwing exceptions.
- Tests: All unit tests in `tests/` must pass with zero errors.

