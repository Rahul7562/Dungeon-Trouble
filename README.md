# DungeonTrouble

**Genre:** 2.5D Isometric Action MMORPG
**Language:** C++
**Engine:** Custom built from scratch, no third-party engines (Unity, Unreal, Godot, GameMaker, MonoGame, pygame, pyglet, Panda3D, cocos2d, RPG Maker, Construct).

## Project Vision

DungeonTrouble is a long-term commercial-grade 2.5D Isometric Action MMORPG. It is inspired by Diablo IV's camera perspective, the responsiveness of Hades, the world density of CrossCode, the loot progression of Diablo, and the persistence of MMORPGs.

### Camera & Perspective
- **Camera:** Fixed isometric camera. Features smooth movement, smooth camera interpolation, camera shake, dynamic zoom support, and modern lighting.
- **Perspective:** 2.5D pixel art (NOT top-down, NOT side-scrolling).

### Art Direction
- Modern HD Pixel Art.
- Dark fantasy mixed with colorful magical environments.
- Large readable sprites, fluid animation.
- Dynamic lighting, weather, particles, and shadow casting.

### Target Feeling
Players should immediately feel:
- "I want to explore."
- "I want better loot."
- "I want one more dungeon."
The gameplay should be satisfying within the first five minutes.

## Documentation

The project documentation is split into several key files within the `DungeonDocs/` directory, each with a specific purpose to guide development.

- **`README.md`** (This file): The front page of the repository. It introduces the project's vision, genre, and top-level goals to any new developer or contributor.
- **`DungeonDocs/FolderStructure.md`**: Explains the repository layout. It justifies the separation between Engine, Client, Server, and Tools to support scaling past 500,000 lines of code.
- **`DungeonDocs/Architecture.md`**: Details the core engine philosophy, data-oriented design, asset pipeline, and performance targets. Crucially, it includes an architectural review and self-critique with suggested improvements.
- **`DungeonDocs/EngineOverview.md`**: Provides a deep dive into every specific engine module (Core, Platform, Renderer, ECS, etc.), explaining *what* it is, *why* it exists, and *how* it scales for the future.
- **`DungeonDocs/CodingStandards.md`**: The source of truth for all C++ coding conventions across the project, including naming, file organization, error handling, logging, testing, and Git strategy.
- **`DungeonDocs/Roadmap.md`**: Outlines the 12-phase long-term development plan from foundation and engine creation, up to MMORPG systems, optimization, and release. Details dependencies between milestones.
- **`DungeonDocs/Contributing.md`**: Outlines the pull request process, CI/CD requirements, and asset handling rules to maintain a high-quality, stable codebase.
