# Engine Modules Overview

This document explains every subsystem, its responsibility, its rationale, and its scalability.

- **Core:** Contains low-level constructs like custom allocators, assertions, logging, and containers. It exists to ensure zero unexpected overhead from standard libraries. Highly scalable as memory management is explicit.
- **Platform:** OS abstractions. Exists to prevent platform-specific code from bleeding into the engine. Very scalable to new consoles.
- **Window:** Manages OS window creation and context handling.
- **Input:** Captures hardware input and abstracts it into generic game actions. Exists to support easy rebinding and multiple gamepad types. Scalable to new controllers.
- **Renderer:** Submits draw commands to the GPU. Wraps graphics APIs. Scales using multi-threaded command list generation and instancing.
- **Audio:** Handles 2D/3D audio playback and mixing. Asynchronous design scales well on multi-core CPUs.
- **Physics:** Collision detection and resolution. Custom lightweight implementation for snappy combat rather than realistic simulation.
- **Animation:** Sprite and skeletal animation playback. Data-driven to handle thousands of entities.
- **Math:** Matrix, vector, and quaternion operations. Hand-optimized for SIMD.
- **Resources:** Asynchronous asset streaming and caching. Crucial for fast loading and low memory usage.
- **Serialization:** Converts objects to/from byte streams. Essential for saving, config parsing, and networking.
- **Scene:** Scene graphs, spatial partitioning, culling. Scales to massive maps via Quadtrees.
- **Entity Component System (ECS):** Stores data in contiguous arrays. Replaces deep inheritance. Scales to millions of iterations per frame.
- **Networking:** Reliable UDP, state replication. Scales horizontally for MMO servers.
- **Database:** Server-side persistence wrapper. Connection pooling for high concurrency.
- **AI:** Pathfinding and behavior trees. Sliced across multiple frames to avoid CPU spikes.
- **UI:** Rendering HUDs and menus. Retained and immediate mode support.
- **Particles:** GPU/CPU particle systems for spells and weather. Highly scalable on GPU compute.
- **Lighting:** Dynamic 2D light sources and shadow casters.
- **Terrain:** Rendering large static background geometries.
- **Tile Engine:** Managing grid-based placement and rendering.
- **Save System:** Player persistence. Uses the Serialization module.
- **Profiler:** Real-time CPU/GPU tracking to enforce the 60/120 FPS targets.
- **Debugger:** In-game variable tweaks and state inspection.
- **Console:** Quake-style developer command line.
- **Localization:** String replacement based on user locale.
- **Plugin System:** Allows reloading game logic DLLs without engine restarts.
- **Asset Pipeline:** Interfacing with baked asset metadata.
- **Tool Framework:** Shared code used by both the Editor and CLI tools.
