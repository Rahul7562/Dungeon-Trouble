# Town-1 Overworld Expansion, Medieval Architecture & Daylight Cycle

An immersive overhaul of the Town-1 Sanctuary overworld featuring an expanded asymmetric village layout, multi-story half-timbered medieval buildings with dynamic roof cutaways and furnished interiors, autonomous wandering NPCs and townsfolk, and a continuous 24-hour daylight cycle with an interactive clock display above the minimap.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and gameplay decisions incorporate your preferences from Phase 1:

- **Confirmed Decision 1 — Dynamic Roof Fade & Furnished Interiors**: Medieval houses feature tall stone-and-timber Tudor facades, pitched shingle/slate roofs, dormers, and chimneys inspired by the reference sheets. When the player walks through a doorway into any building's footprint, its roof smoothly fades out (`opacity -> 0.08`) to reveal warm wooden plank floors, rugs, beds, bookshelves, tables, hearths, anvils, and chests inside.
- **Confirmed Decision 2 — 4-Minute 24-Hour Daylight Cycle**: In-game time progresses continuously at a pace of 4 real-time minutes per 24-hour cycle (`10 in-game minutes = 1 real second`), transitioning smoothly across Dawn, Morning, Afternoon, Golden Evening, Dusk, and Starlit Night.
- **Confirmed Decision 3 — Wandering NPCs & Night Lanterns**: Key service NPCs (Elder, Cleric, Vault Keeper, Merchant, Blacksmith, Gatekeeper) stroll naturally around their respective districts and interiors while pausing when the player approaches to talk. Additional ambient villagers (Town Guard, Herbalist, Bard, Innkeeper, Apprentice, Townsfolk) roam along asymmetric cobblestone lanes, visit houses, pause to perform daily activities, and automatically ignite warm handheld lanterns from Dusk through Dawn.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms Town-1 from a small symmetric 32×32 square into a sprawling, organic 48×48 medieval sanctuary village where every building can be entered, inspected, and explored while dynamic sun/moon lighting shifts across the day.
- **Target Audience / Persona**: Action RPG players who want a living, atmospheric overworld hub to explore, trade, craft, and prepare in before delving into the 10-floor dungeon.
- **Key Value**: Replaces static, symmetric box walls with authentic half-timbered medieval architecture, lived-in interior furnishings, autonomous NPC life cycles, and readable time-of-day atmospheric transitions.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Exploring the Asymmetric Medieval Village**:
   - The player spawns near the off-center Sanctuary Plaza fountain and can follow winding cobblestone paths branching northwest to the **Elder's Manor**, northeast to **St. Althea's Chapel**, east to the **Blacksmith's Forge & Foundry**, west to the **Ironbound Vault**, south-central to the **Golden Flagon Tavern & Market**, and scattered **Rustic Cottages**, **Watchtower**, and **Apothecary Lodge** across the valley.
2. **Entering Houses & Viewing Interiors**:
   - Approaching and walking through an open doorway transitions the player onto warm timber/flagstone interior flooring.
   - The building's pitched roof, gable dormers, and front eaves smoothly dissolve away to reveal handcrafted interior props: blazing fireplaces, oak dining tables, beds, bookshelves, alchemy racks, weapon stands, anvils, and storage chests.
3. **Observing & Interacting with Living NPCs**:
   - NPCs walk between waypoints (plaza benches, market stalls, house interiors, forge anvils), pausing briefly with subtle idle animations and contextual activity bubbles.
   - Moving within interaction range of any NPC causes them to pause and face the hero so dialogue or shop modals never break mid-conversation.
4. **Tracking Time of Day Above the Minimap**:
   - Directly above the bottom-right Sanctuary Minimap, a dedicated **Chronometer Bar** displays the current 12-hour/24-hour clock (e.g., `04:45 PM`), current phase badge (`Morning`, `Afternoon`, `Evening`, `Night`, `Dawn`), and a dynamic Sun/Moon phase icon with a subtle progress bar showing how close the world is to sunrise or nightfall.

### Visual Identity & Theme
- **Aesthetic Direction**: Hand-crafted 2.5D Isometric Dark-Fantasy & Medieval Tudor Sanctuary.
- **Color Palette & Daylight Mood**:
  - **Dawn (05:00 – 07:30)**: Rose-gold and cool mist horizon (`#f472b6` / `#fdba74` tint), soft lavender shadows, lanterns extinguishing.
  - **Morning (07:30 – 12:00)**: Crisp sunlit sky-gold wash (`#fef08a`), vibrant emerald turf, clear stone contrast.
  - **Afternoon (12:00 – 17:00)**: Warm zenith daylight (`#fde047`), high visibility, tight ground shadows.
  - **Evening / Sunset (17:00 – 20:00)**: Deep amber andburnt crimson dusk glow (`#f97316` / `#fb7185`), elongated shadows, braziers and house windows warming up.
  - **Night (20:00 – 05:00)**: Deep indigo-slate moonlight (`rgba(8, 14, 30, 0.68)` ambient darkness), glowing amber cottage windows, flickering street braziers, and warm handheld NPC lanterns cutting through the night.
- **Typography & Hierarchy**:
  - Display headers in `Cinzel` serif; crisp HUD controls and dialogue in `Plus Jakarta Sans`; clock numerals in `JetBrains Mono` with `tabular-nums` so time ticks never jitter horizontally.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Asymmetric 48×48 Organic Map Layout with Road & Interior Tile Subtypes**
  - *Chosen Approach*: Expand Town-1 from `32×32` to `48×48` tiles with winding main and secondary cobblestone roads, irregular building footprints (L-shaped manor, wide tavern, turreted watchtower, twin-gable cottages), streams/ponds, and varied interior floor zones.
  - *Why*: Eliminates the artificial "four identical boxes in four corners" feel and gives NPCs meaningful routes and interiors to visit.
- **Decision 2: Multi-Layered Isometric Building Renderer with Per-Building Roof Cutaway**
  - *Chosen Approach*: Define structured `TownBuilding` metadata (bounds, roof style: terracotta gable, blue-slate turret, weathered timber lodge; dormer windows; chimneys; door tiles). When the player's world coordinates fall inside (or within 1 tile of the doorway of) a building, its roof alpha smoothly interpolates down to `0.06` while keeping back/side half-timbered walls and all interior furniture visible.
  - *Why*: Delivers the exact look of the reference medieval houses from the outside while letting players seamlessly walk inside and see every piece of furniture without loading screens.
- **Decision 3: Waypoint & Activity State Machine for NPCs**
  - *Chosen Approach*: Equip NPCs with a lightweight patrol/wander state machine (`walking` -> `pausing` -> `working/chatting`) using collision-aware steering (`resolveCircleMovement`) and curated district/town waypoints.
  - *Why*: Ensures NPCs never get stuck on walls or furniture while making the town feel genuinely alive.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        GameEngine (Simulation State)                       │
│  ┌──────────────────────────┐  ┌───────────────────────┐  ┌──────────────┐ │
│  │ TownOverworld (48x48)    │  │ DaylightCycleClock    │  │ NPC Roaming  │ │
│  │ • Asymmetric Districts   │  │ • timeOfDayHours 0-24 │  │ • Waypoints  │ │
│  │ • 9 Medieval Buildings   │  │ • 240s Full Cycle     │  │ • Activities │ │
│  │ • Interior Furniture     │  │ • Phase & Sun/Moon    │  │ • Lanterns   │ │
│  └────────────┬─────────────┘  └───────────┬───────────┘  └──────┬───────┘ │
└───────────────┼────────────────────────────┼─────────────────────┼─────────┘
                │                            │                     │
                ▼                            ▼                     ▼
┌───────────────────────────────────────────────────────┐  ┌─────────────────┐
│              IsometricRenderer (Canvas 2.5D)          │  │   Minimap HUD   │
│  1. Terrain Pass: Grass, Winding Cobble, Wood Floors  │  │ ┌─────────────┐ │
│  2. Depth-Sorted Pass:                                │  │ │ Time & Phase│ │
│     • Stone Foundations & Half-Timber Tudor Walls     │  │ │ 06:45 PM    │ │
│     • Interior Props (Beds, Hearths, Tables, Books)   │  │ │ [Evening]   │ │
│     • Roaming NPCs + Handheld Night Lanterns + Hero   │  │ ├─────────────┤ │
│     • Pitched Gable Roofs & Turrets (Fade when inside)│  │ │ 48x48 Radar │ │
│  3. Daylight & Lightmap Composite Pass:               │  │ │ + Buildings │ │
│     • Dynamic Ambient Sky Tint (Dawn/Day/Dusk/Night)  │  │ │ + Live NPCs │ │
│     • Glowing Windows, Braziers & Lantern Cutouts     │  │ └─────────────┘ │
└───────────────────────────────────────────────────────┘  └─────────────────┘
```

### Data Model & State Additions
- **`TownBuilding` Definition**:
  - Stores `id`, `name`, `bounds: { x, y, w, h }`, `wings` (for L-shaped or multi-section houses), `doors: TileCoord[]`, `roofStyle: 'terracotta_tudor' | 'teal_slate_manor' | 'weathered_stone_inn' | 'rustic_cottage'`, `hasTurret`, `chimneys`, and `windowTiles`.
- **`DungeonPropKind` Extensions for Interiors & Village**:
  - Adds interior and village prop types: `'bed'`, `'table'`, `'chair'`, `'bookshelf'`, `'fireplace'`, `'rug'`, `'anvil'`, `'weapon_rack'`, `'alchemy_table'`, `'well'`, `'street_lantern'`, `'market_stall'`, `'bench'`.
- **NPC Roaming & Activity State**:
  - Extends `NPCEntity` with `homePos`, `wanderRadius`, `waypoints`, `targetX`, `targetY`, `moveSpeed`, `waitTimer`, `currentActivity`, `isMoving`, and `carriesLanternAtNight`.
- **Daylight Cycle State (`worldTimeHours`)**:
  - Stored on `GameEngineState` (initialized at `9.5` = `09:30 AM`), advancing by `(24 / 240) * dt` hours per second (`0.1` in-game hours per real second = 4 minutes per 24-hour day).
  - Helper selector computes `phase` (`'Dawn' | 'Morning' | 'Afternoon' | 'Evening' | 'Dusk' | 'Night'`), formatted time string (`HH:MM AM/PM`), ambient darkness alpha, sky directional tint, shadow length, and whether night lights/lanterns are active.

### Interactive Component & State Mapping
- **Above-Minimap Time & Daylight Widget**:
  - Rendered directly above the Minimap canvas inside the bottom-right HUD cluster.
  - Displays the dynamic sky icon (Sun, Sunset, Crescent Moon), current formatted clock (`tabular-nums`), time-of-day phase label, and a daylight progress bar, plus a subtle button to fast-forward time by +3 hours for players who want to immediately test or experience afternoon, evening, or night lighting.
- **Minimap Building & Interior Rendering**:
  - Updates the Minimap canvas to distinguish outdoor grass, winding cobblestone roads, warm wooden house interiors, doorway openings, and live-moving NPC dots.
