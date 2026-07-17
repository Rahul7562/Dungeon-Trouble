# Roadmap

## Phase 1: Foundation
- **Milestone 1:** Repository structure, architecture design, documentation.
- **Milestone 2:** Core math, memory allocators, logging.

## Phase 2: Engine
- **Milestone 3:** Platform/Window abstractions, Input.
- **Milestone 4:** Resource manager, Serialization.

## Phase 3: Graphics
- **Milestone 5:** Low-level Renderer API wrapper.
- **Milestone 6:** 2D Sprite batching, Shaders.

## Phase 4: World
- **Milestone 7:** Tile Engine, Scene graph.
- **Milestone 8:** Entity Component System (ECS).

## Phase 5: Gameplay
- **Milestone 9:** Physics, collision, movement controllers.
- **Milestone 10:** Camera movement and shake.

## Phase 6: Combat
- **Milestone 11:** Hitboxes, damage calculation.
- **Milestone 12:** Animation and state machines.

## Phase 7: RPG Systems
- **Milestone 13:** Inventory, stats, loot generation.
- **Milestone 14:** Save system persistence.

## Phase 8: Networking
- **Milestone 15:** Reliable UDP socket implementation.
- **Milestone 16:** Entity replication and RPCs.

## Phase 9: MMORPG Systems
- **Milestone 17:** Server authority and database pooling.
- **Milestone 18:** Chat, matchmaking, and instances.

## Phase 10: Content
- **Milestone 19:** Asset pipeline automation.
- **Milestone 20:** Level design tools in DungeonEditor.

## Phase 11: Optimization
- **Milestone 21:** Multithreading and Profiling optimizations.
- **Milestone 22:** Memory footprint reduction.

## Phase 12: Release
- **Milestone 23:** Beta testing and load testing.
- **Milestone 24:** Version 1.0 Release.

### Dependencies
- Phase N always depends on Phase N-1. Networking requires Gameplay logic to be robust. Optimization occurs late but requires Profiler hooks integrated from Phase 1.
