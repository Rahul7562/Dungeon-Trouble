# DungeonTrouble

**Genre:** 2.5D Isometric Action RPG  
**Language:** TypeScript  
**Framework:** React 18, Vite 6, Tailwind CSS, HTML5 Canvas  

## Project Vision

DungeonTrouble is a fast-paced 2.5D Isometric Action RPG inspired by Diablo's isometric perspective and loot progression, combined with the fluid responsiveness of modern action games.

### Camera & Perspective
- **Camera:** Smooth isometric camera projection with interpolation, dynamic screen shake, and ambient light rendering.
- **Perspective:** 2.5D isometric dungeon grid coordinate system with accurate depth-sorting.

### Gameplay & Systems
- **Authoritative Simulation Loop:** Deterministic 30Hz simulation clock with spiral-of-death protection.
- **Entity Component System (ECS):** Generation-recycled entity IDs, component views, and deferred command buffers.
- **Multi-Channel Event Bus:** Queued and immediate dispatching across system, gameplay, render, and UI channels.
- **Combat & Damage Pipeline:** Deterministic pipeline processing attacker stats, defender armor mitigation, critical strike checks, evasion rolls, and lethal damage events.
- **Ability & Status Effect Engine:** Cast timings, cooldown management with CDR stats, projectile spawning, and ticking status effect buffs/debuffs (Bleed, Stun, Haste, Might, Ignite).
- **Itemization & Loot System:** Item definitions, equipment slots with dynamic stat modifiers, weighted drop tables with guaranteed roll mechanics, and rarity light pillars.
- **World & Zones:** Procedural and tile-mapped dungeon zones with spawn point markers and collision boundaries.

## Running & Testing

```bash
# Run unit test suite
npm test

# Build application for production
npm run build

# Run type check and linter
npm run lint

# Start development server
npm run dev
```
