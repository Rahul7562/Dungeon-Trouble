# TDD — Gameplay Systems (Phase G)

Technical design for the headless gameplay foundation (M13-M20). Companion to
GAME_DESIGN_BIBLE.md. Every Phase G Jules spec is derived from this document.

## Module map (target state at end of Phase G)

| Module | Depends on | Purpose |
|---|---|---|
| ECS | Core | Entity registry, sparse-set components, views, command buffer |
| Events | Core | Sync dispatcher + deferred queues (SYSTEM/GAMEPLAY channels) |
| Simulation | Core | Fixed 30 Hz tick, phase-ordered systems, deterministic seeds |
| Gameplay/Stats | ECS, Events | Attributes, derived stats, modifier stacking |
| Gameplay/Combat | ECS, Events, Simulation, Stats | Damage pipeline, hit registration, death |
| Gameplay/Abilities | Combat | Ability defs, cooldowns, costs, status effects |
| Gameplay/Items | Stats, FileSystem | Item defs (data-driven), inventory, equipment |
| Gameplay/Loot | Items, Simulation | Loot tables, deterministic+RNG rolls |

## System tick phases (SystemScheduler `phase` convention)

| Phase | Constant | Systems |
|---|---|---|
| 0 | PhaseInput | (reserved — network/player intents later) |
| 100 | PhaseLogic | AI, abilities, status-effect ticks |
| 200 | PhaseMovement | movement/knockback integration (M22) |
| 300 | PhaseCombat | damage pipeline resolution, death processing |
| 400 | PhasePost | loot rolls, cleanup, command-buffer flush |
| 500 | PhaseEvents | GAMEPLAY event queue drain |

Rule: systems may enqueue events at any phase; queued GAMEPLAY events are drained at
PhaseEvents in the same tick. Cross-tick effects use next tick's queue.

## M16 Stats & Attributes — design

* Primary attributes: STR, DEX, INT, VIT (per GDD archetypes).
* Derived stats: MaxHealth, MaxMana, AttackPower, SpellPower, Armor, Evasion,
  CritChance, CritMultiplier, MoveSpeed, CooldownReduction.
* `StatSheet` component: base values + computed cache.
* Modifiers: {source id, stat, op ∈ {Flat, PercentAdd, PercentMult}, value, (optional) duration ticks}.
  Application order: base → sum(Flat) → ×(1+Σ PercentAdd) → ×Π(1+PercentMult).
* Recalc is lazy: dirty flag per sheet, computed on read or end-of-tick.
* No floats in comparisons for determinism-critical paths; stats stored as f32 but
  damage math truncates to i32 at pipeline boundaries.

## M17 Combat — design

* `DamageEvent` (queued, GAMEPLAY channel): source entity, target entity, base amount,
  school ∈ {Physical, Fire, Frost, Arcane, Shadow}, flags (CanCrit, IgnoreArmor, TrueDamage).
* Pipeline (PhaseCombat): base → school scaling from source stats → crit roll
  (SimRandom from SimContext seed) → target mitigation (Armor for Physical, resist per school)
  → clamp ≥ 0 → apply to `Health` component → emit `DamageAppliedEvent` / `EntityDiedEvent`.
* Hitboxes: `HitShape` component (circle | AABB on iso plane) + `TeamId`; overlap queries
  are brute-force in M17 (spatial partitioning arrives in M21 — keep the query behind an
  interface so the accelerator can be swapped in).
* Death: `EntityDiedEvent` → corpse tag component + removal via command buffer at PhasePost.

## Determinism contract (all Phase G modules)

1. All randomness flows from `SimContext.randomSeed` (per-tick, derived from base seed).
2. Iteration order over ECS views is deterministic (dense-array order).
3. No wall-clock time in gameplay logic — tick number only.
4. Two SimulationLoops with the same base seed and identical inputs produce identical
   component state, verified by simulation-level tests each milestone.

## Data-driven content rule

Item/ability/loot definitions load from JSON under `Assets/Data/` via VFS at startup into
immutable definition tables; ECS components reference definitions by id (u32). No gameplay
tuning constants hardcoded in .cpp — they live in data files from M18 onward.
