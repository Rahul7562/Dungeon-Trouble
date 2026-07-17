# Architecture Overview

## Engine Philosophy
The engine must be completely modular. Subsystems must never depend on each other unnecessarily. Everything should communicate using clean interfaces. Every system should be replaceable. The engine should support future additions without major rewrites. Every decision should optimize for readability, maintainability, scalability, performance, modularity, and documentation. Never create shortcuts, hardcode values, create duplicate systems, or sacrifice architecture for speed.

## Asset Pipeline
The asset pipeline handles the lifecycle of game assets from raw formats to optimized binary data for fast loading.
- **Support:** Textures, Sprites, Tilemaps, Animations, Audio, Fonts, Localization, Shaders, Future mod support.
- **Architecture:** Tools in `DungeonTools` compile assets. The `DungeonEngine/AssetPipeline` module acts as a runtime bridge and metadata index for the Engine.

## Performance Targets
- **Framerate:** 60 FPS minimum, 120 FPS preferred.
- **Memory:** Low memory overhead using custom allocators.
- **Loading:** Fast startup and efficient background resource streaming.
- **CPU:** Multithread-ready architecture leveraging job systems.

## Architectural Review and Improvements

### Review of the Current Architecture
The strict modularity and separation into `DungeonEngine`, `DungeonClient`, `DungeonServer`, and `DungeonEditor` is highly resilient. It ensures the Server can run entirely headless without linking a Renderer.

### Rationale and Future Scalability
The decision to avoid third-party engines places a high upfront burden on development but grants us absolute control over performance, network replication, and asset streaming, which are the main bottlenecks for MMORPGs. ECS is inherently scalable.

### Suggested Improvements
- **Data-Driven Configuration:** Ensure that all parameters (hitboxes, spell damage) are hot-reloadable from `Config/` JSON or YAML files to speed up iteration times.
- **Networking Abstraction:** The network transport layer must be completely abstracted so we can swap out socket implementations (e.g., ENet vs WebRTC for potential web clients).
- **Automated Testing:** Integration tests for rendering should be implemented early using image diffing tools in headless mode.
- **Math Library:** Consider if creating a custom Math library is truly necessary versus using GLM or DirectXMath to save initial development time, though keeping a wrapper over it is essential.
