# Roadmap — DungeonTrouble (Rev 2, 2026-07-19)

> **Strategic pivot (Rev 2):** Gameplay mechanics come BEFORE rendering. DungeonTrouble is an
> MMORPG — the authoritative server is headless, so every gameplay system (ECS, combat, stats,
> items, AI) is built and validated with unit/simulation tests first. Rendering, art, and
> character design are deferred to Phase R. This maximizes testable progress and prevents
> gameplay logic from ever coupling to presentation.
>
> Status legend: ✅ done · 🔄 in progress · ⏳ planned

## Phase 0: Engine Foundation — ✅ COMPLETE (M1-M12)
* ✅ M1-M4: Core types, Result/Error, logging, build system (CMake + Catch2).
* ✅ M5-M6: Memory allocators (Arena, Stack, FreeList, Pool).
* ✅ M7: Diagnostics (profiler, performance counters, crash handling).
* ✅ M8: FileSystem + VFS (path-traversal hardened), Configuration (layered providers).
* ✅ M9: Platform abstraction (Linux/Windows/macOS), Window management.
* ✅ M10: Input system (keyboard/mouse/gamepad, contexts, action mapping).
* ✅ M11: Math library (Vec2/3/4, Mat4, quaternions, geometry, easing).
* ✅ M12: Threading + Job System (work-stealing scheduler, parallel-for).
* ✅ M12.5: Pre-gameplay hardening — zero warnings, VFS security, FileStream UB fix (PRs #47-#53).

## Phase G: Gameplay Foundation (M13-M20) — 🔄 CURRENT
Headless simulation core. No rendering dependencies allowed in any Phase G module.
* 🔄 M13: **ECS Core** — entity registry, sparse-set component storage, views/queries, deferred command buffer.
* 🔄 M14: **Event System** — synchronous dispatcher + queued event bus; gameplay/system channels.
* 🔄 M15: **Simulation Loop** — fixed-tick simulation (deterministic, 30 Hz), tick scheduler, time services, system update ordering.
* ⏳ M16: **Stats & Attributes** — attribute sheets (STR/DEX/INT/VIT), derived stats, modifier stacking (flat/percent/mult), stat recalculation graph.
* ⏳ M17: **Combat Core** — damage pipeline (mitigation, resist, crit), hitbox/hurtbox shapes on ECS, hit registration (headless), damage events, death/respawn.
* ⏳ M18: **Abilities & Status Effects** — ability definitions (cast time, cooldown, cost, telegraphs), buff/debuff engine (DoT, HoT, CC), synergy hooks.
* ⏳ M19: **Items & Inventory** — item definitions (data-driven via VFS/JSON), inventory containers, equipment slots, stat integration.
* ⏳ M20: **Loot & Drop System** — loot tables (deterministic + RNG blend per GDD), drop rolls, rarity tiers, pickup flow.

## Phase W: World Simulation (M21-M28) — ⏳
* M21: Spatial partitioning (grid/quadtree for isometric world), proximity queries.
* M22: Collision & movement (2D physics on iso plane: solids, triggers, knockback).
* M23: Zone/map data model (tiles, nav data, spawn points, hazards) — data-driven.
* M24: NPC AI foundation — behavior trees, perception, aggro tables.
* M25: Pathfinding (A* on nav grid, steering, formation avoidance).
* M26: Enemy archetypes & spawning (spawners, packs, elites, leashing).
* M27: Boss mechanics framework (phases, telegraphs, scripted patterns).
* M28: Interaction system (doors, chests, levers, gathering nodes).

## Phase P: Progression & Content Systems (M29-M36) — ⏳
* M29: XP/leveling, class definitions, archetype data model.
* M30: Skill trees (nodes, prerequisites, respec) per GDD flexible-archetype rule.
* M31: Quest system (objectives, tracking, rewards, chains) — data-driven.
* M32: Dialogue & NPC interaction framework.
* M33: Crafting foundation (recipes, materials, quality tiers — crafted > dropped per GDD).
* M34: Economy primitives (currency, vendors, pricing hooks for player-driven market).
* M35: Persistence — save/load of world + character state (versioned schemas).
* M36: **First playable headless dungeon** — full vertical slice in simulation tests: enter → fight packs → boss → loot → exit.

## Phase R: Rendering & Presentation (M37-M48) — ⏳ (deferred by design)
* M37-M39: Renderer abstraction, 2.5D isometric camera, sprite batching.
* M40-M42: Animation system (sprite sheets, blending, readable wind-ups per GDD).
* M43-M45: UI framework (HUD, inventory, skill tree screens — unobtrusive, customizable).
* M46-M48: VFX, telegraphs rendering, damage numbers, audio integration.
* Character design & Art Bible production begins here.

## Phase N: Multiplayer & Networking (M49-M60) — ⏳
* M49-M52: Networking core (reliable UDP), protocol, serialization.
* M53-M56: Authoritative server, entity replication, interest management (reuses Phase G headless sim).
* M57-M60: Client prediction/reconciliation, chat, auth, lobby.

## Phase B: Beta Systems (M61+) — ⏳
* Guilds, housing, PvP zones/arenas, trading, market, live-ops tooling.

## Architectural rules for Phase G (enforced in review)
1. No Phase G module may include Window/Input/Renderer headers — simulation is headless.
2. All gameplay data (items, abilities, loot tables) is data-driven, loaded via VFS.
3. Fixed-tick determinism: same inputs + same seed ⇒ same simulation state (networking prereq).
4. Every system ships with Catch2 tests; simulation-level tests act as integration tests.
5. ECS is the single source of truth for runtime game state; no parallel object hierarchies.
