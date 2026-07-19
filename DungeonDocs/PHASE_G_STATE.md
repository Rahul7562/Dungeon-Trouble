# Phase G Execution State (M13-M20)

Tracking file for the gameplay-foundation milestone batch. Update after every session/PR event.

| Milestone | Module | Jules Session | State | PR | Merged |
|---|---|---|---|---|---|
| M13 ECS Core | DungeonEngine/ECS | 17306491816127604942 (retry) | done | #56 | ✅ |
| M14 Event System | DungeonEngine/Events | 9501713371708288481 | done | #55 | ✅ |
| M15 Simulation Loop | DungeonEngine/Simulation | 14194793646827082701 | done | #54 | ✅ |
| M16 Stats & Attributes | DungeonEngine/Gameplay | not started (needs M13) | - | - | - |
| M17 Combat Core | DungeonEngine/Gameplay | not started (needs M13,M15,M16) | - | - | - |
| M18 Abilities & Status FX | DungeonEngine/Gameplay | not started (needs M17) | - | - | - |
| M19 Items & Inventory | DungeonEngine/Gameplay | not started (needs M16) | - | - | - |
| M20 Loot & Drops | DungeonEngine/Gameplay | not started (needs M19) | - | - | - |

## Dependency graph
M13 (ECS), M14 (Events), M15 (Sim) — independent, run in parallel (batch 1).
M16 needs M13. M19 needs M16. M17 needs M13+M15+M16. M18 needs M17. M20 needs M19.
Batch 2 (after batch 1 merges): M16 alone. Batch 3: M17 + M19 in parallel. Batch 4: M18 + M20 in parallel.

## Review gate per PR (in addition to code-review-rubric)
- No Window/Input/render includes in Phase G modules (headless rule).
- No try/catch/throw (engine is -fno-exceptions).
- Warning-free local build: -Wall -Wextra -Wpedantic.
- All new + existing test suites pass locally before merge.
- Determinism: M15+ tests must prove same-seed reproducibility.
