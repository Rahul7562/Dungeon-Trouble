# Dungeon Trouble — 2.5D Isometric Graphics & Rendering Overhaul

A complete visual transformation of the real-time gameplay viewport from primitive geometric placeholders into a handcrafted 2.5D dark-fantasy action RPG with pre-rendered HD tile and prop atlases, articulated multi-limb character and monster rigs, offscreen dynamic lightmap compositing, and multi-layered spell and weapon combat effects.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core artistic and rendering pipeline choices have been confirmed and locked in for the overhaul while preserving 100% compatibility with existing gameplay mechanics, physics, hit detection, and controls.

- **Confirmed Character & Monster Art Pipeline**: **Pre-rendered HD sprite atlas with layered vector rigs** — Characters and monsters are rendered using articulated multi-part dark-fantasy vector rigs (boots, greaves, torso armor, pauldrons, cloak/hood, head/helm, glowing visor/eyes, and directional weapons/shields) combined with cached HD offscreen sprite/texture stamps for crisp performance and smooth 60 FPS procedural skeletal animation across idle, walk, attack, cast, dash, hit, and death states.
- **Confirmed Lighting & Shadow Architecture**: **Offscreen lightmap compositing with warm torch flicker and shadows** — An offscreen lighting canvas composites ambient dungeon darkness with warm flickering radial torch/brazier light fields, cool cyan/violet crystal and spell illumination, soft directional floor drop-shadows, and wall ambient occlusion without washing out combat readability.
- **Confirmed Architectural Texture Style**: **Handcrafted stone slabs with moss, cracks, runes, and 3D beveled walls** — A deterministic procedural texture baker generates high-detail isometric floor variants (chipped flagstones, mortar joints, moss clusters, bloodstains, scattered bones/pebbles, and etched runic sigils) alongside multi-tiered 3D beveled stone wall blocks with individual ashlar masonry courses, top cornices, wall-base ambient occlusion, and depth-sorted architectural props.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the simplistic flat-polygon canvas primitives in the gameplay viewport with a multi-stage 2.5D isometric rendering engine featuring cached HD procedural textures, depth-sorted architectural landmarks, distinct animated hero and monster rigs, real-time offscreen lightmap blending, and high-impact combat VFX.
- **Target Audience / Persona**: Action RPG players who expect immediate atmospheric immersion, tactile weapon and spell impact, unmistakable enemy silhouettes, and rich environmental storytelling as they explore and fight through the 10-floor labyrinth and Town-1 sanctuary.
- **Key Value**: Delivers a dramatic, unmistakable leap in in-game visual quality during actual dungeon exploration and combat while maintaining 60 FPS frame pacing and preserving all existing game systems.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Town Sanctuary Visuals**: Players spawn in a richly detailed cobblestone town square surrounded by timber-and-stone sanctuary walls, glowing crystal fountain water with animated ripples and rising mist motes, warm street braziers, lush perimeter trees with layered foliage canopies, and distinct robed/armored NPC artisans.
  2. **Dungeon Exploration**: Stepping into the dungeon reveals individually weathered stone flagstones with mortar depth, moss crevices, scattered skulls, cracked masonry, and 3D isometric walls that cast deep ambient shadows onto adjacent floors and properly occlude characters walking behind them.
  3. **Visceral Real-Time Combat**: Executing abilities triggers multi-layered weapon arcs, directional afterimages, glowing embers, expanding frost crystal rings, hit-stop flashes, and dynamic spell illumination that lights up nearby stone tiles and walls.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Handcrafted Dark-Fantasy Isometric Action RPG (inspired by *Hades*, *Diablo II: Resurrected*, and *Curse of the Dead Gods*).
  - *Color Palette & Mood*:
    - `--background`: Deep Abyssal Obsidian (`#05070c`) with Void Slate (`#0c101a`) shadowed recesses
    - `--primary`: Warm Torch Amber (`#f59e0b` / `#fb923c`) and Hearth Gold (`#fef08a`)
    - `--accent`: Arcane Cyan (`#38bdf8`), Eldritch Violet (`#c084fc`), and Crimson Blood (`#ef4444`)
    - Biome-specific stone grading across all 4 dungeon themes (*Forgotten Catacombs*, *Frozen Depths*, *Corrupted Temple*, and *Ember Crypt*)
  - *Typography & Hierarchy*: High-contrast `Cinzel` serif for critical strikes, boss nameplates, and runic prompts paired with crisp `Plus Jakarta Sans` for ground loot labels and floating combat numbers.
  - *Spatial Composition & Isometric Depth*: True `2:1` isometric projection (`64x32` diamond base footprint, `52px` extruded 3D wall height) with strict `(worldX + worldY)` painter's algorithm depth sorting across walls, props, loot, summons, enemies, and the hero.
- **Interactive Feedback & Motion**:
  - **Twin Cleave**: Sweeping metallic blade trail with dual crescent energy ribbons, contact sparks, and directional slash bursts.
  - **Inferno Burst**: Blazing core projectile trailed by volumetric flame particles, detonating into a multi-ring scorch crater and rising embers.
  - **Frost Nova**: True-radius expanding glacial shockwave with 3D jutting ice spikes, crystalline floor frost patterns, and shattering ice shards.
  - **Aether Dash**: High-velocity phase streak with 4 translucent hero afterimages, arcane warp rings at origin and destination, and trailing lightning motes.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic Offscreen Texture Atlas Baking for Tiles & Walls**
  - *Chosen Approach*: Pre-render a deterministic bank of 16+ floor tile variants and 8+ 3D wall block variants per biome theme onto offscreen HTML5 Canvas atlases when a theme loads, then stamp them via fast `drawImage` calls during the frame loop.
  - *Why*: Drawing intricate stone bevels, mortar lines, moss patches, pebble debris, and ashlar brick courses per tile from scratch every frame would cost ribuan path operations; baking them once into an offscreen atlas delivers rich handcrafted detail at a fraction of a millisecond per frame.
  - *Alternatives Considered*: Per-frame procedural path drawing (too slow for high detail) or external network PNGs (violates local self-contained reliability).
- **Decision 2: Articulated Multi-Layer Character & Monster Rigs with Animated States**
  - *Chosen Approach*: Construct each hero class and enemy archetype from layered anatomical components (legs/stride cycle, torso cuirass/robes, pauldrons, cloak sway, head/helm, directional gaze, off-hand shield/tome/orb, and main-hand weapon swing/cast pose) driven by deterministic animation curves (`idle`, `walk`, `attack`, `cast`, `dash`, `hit`, `death`).
  - *Why*: Ensures every unit looks like an unmistakable fantasy character or monster from all 360° aiming angles, with genuine limb movement, weapon swing arcs, and recoil rather than colored circles or triangles.
  - *Alternatives Considered*: Single static SVG icons (lacks directional aiming and fluid weapon swing animation).
- **Decision 3: Offscreen Multiplicative & Additive Lightmap Pass**
  - *Chosen Approach*: Maintain a dedicated offscreen lightmap canvas that fills with biome ambient darkness, punches out soft multi-stop radial gradients around the player, torches, braziers, crystals, portals, and active spell projectiles, and composites over the scene alongside additive bloom highlights and wall drop-shadows.
  - *Why*: Creates authentic dungeon atmosphere where torches and spells genuinely illuminate dark stone corners while guaranteeing the area around the hero remains crisp and readable during combat.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GameCanvas (60 FPS Render Loop)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IsometricRenderer Pipeline Coordinator                  │
├──────────────────────┬───────────────────────────┬──────────────────────────┤
│ 1. Atlas Baker       │ 2. Depth-Sorted Scene     │ 3. Lighting & VFX Engine │
│ (Offscreen Cache)    │    Graph (Y-Sorting)      │    (Offscreen Composite) │
└──────────┬───────────┴─────────────┬─────────────┴─────────────┬────────────┘
           │                         │                           │
           ▼                         ▼                           ▼
┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐
│ • 16 Floor Variants  │  │ • 3D Ashlar Wall Blocks │  │ • Ambient Shadow Map │
│   (Cracks, Moss,     │  │   + Wall Base Occlusion │  │ • Flickering Torch & │
│    Runes, Blood)     │  │ • 12 Handcrafted Props  │  │   Spell Light Fields │
│ • 8 Beveled 3D Walls │  │ • Articulated Hero Rig  │  │ • Twin Cleave /      │
│ • Ground Decal Stamps│  │ • 6 Distinct Enemy Rigs │  │   Inferno / Frost /  │
│   (Scorch, Frost,    │  │   (Skeleton, Stalker,   │  │   Aether Dash Trails │
│    Cobwebs, Debris)  │  │    Archer, Brute, Lich, │  │ • Floating Dust &    │
│                      │  │    Dungeon Lord Boss)   │  │   Ember Motes        │
└──────────────────────┘  └─────────────────────────┘  └──────────────────────┘
```

- **Data Model & State**:
  - **Offscreen Tile & Wall Atlas Cache**: Keyed by `DungeonThemeId` (`forgotten_catacombs`, `frozen_depths`, `corrupted_temple`, `ember_crypt`, plus `town`), storing pre-baked high-DPI canvas bitmaps for floor slabs, cracked/mossy/runic variants, water/lava edges, and 3D multi-course stone walls.
  - **Expanded Environmental Props & Decals**: Deterministic room decoration generator placing wall torches, iron braziers, stone columns, ruined arches, wooden barrels, crates, bone piles, chained sarcophagi, cobwebs, broken statues, and arcane crystals with proper walkability and collision radii.
  - **Animation State Tracker**: Tracks per-entity stride phase, weapon swing arc, dash afterimage ring-buffer, hit-flash decay, and death dissolve/collapse animations without altering core combat timing or hitboxes.
- **Interactive Component & State Mapping**:
  - **Player Movement & Dash**: Feeds velocity and facing angle into the hero skeletal rig to animate leg stride, cloak billow, shoulder rotation, and Aether Dash afterimage trails.
  - **Ability Activation (Slots 1–4)**: Spawns synchronized ground decals (Frost Nova ice glyph, Inferno scorch mark), multi-layered weapon slash ribbons, and dynamic point-lights that illuminate surrounding dungeon geometry.
  - **Camera & Depth Occlusion**: Automatically renders front/side wall faces with stone cornices and slightlyghosts tall southern walls when they directly occlude the player or enemies immediately behind them so combat visibility is never lost.
