# Repository Folder Structure

The repository is designed to scale beyond 500,000 lines of code, strictly separating concerns between engine, client, server, and tools.

```text
DungeonTrouble/
├── Build/            # Build scripts, CMake configurations, and output binaries.
├── Config/           # Global configuration files (JSON/YAML) for engine, server, and client.
├── DungeonAssets/    # Raw assets (sprites, audio, models) and processed game data.
├── DungeonClient/    # The client-side game application. Consumes DungeonEngine.
├── DungeonDocs/      # Project documentation, architecture specs, and style guides.
├── DungeonEditor/    # Custom WYSIWYG editor for world-building, UI, and asset management.
├── DungeonEngine/    # The core custom game engine. Completely game-agnostic.
│   ├── AI/
│   ├── Animation/
│   ├── AssetPipeline/
│   ├── Audio/
│   ├── Console/
│   ├── Core/
│   ├── Database/
│   ├── Debugger/
│   ├── ECS/
│   ├── Input/
│   ├── Lighting/
│   ├── Localization/
│   ├── Math/
│   ├── Networking/
│   ├── Particles/
│   ├── Physics/
│   ├── Platform/
│   ├── PluginSystem/
│   ├── Profiler/
│   ├── Renderer/
│   ├── Resources/
│   ├── SaveSystem/
│   ├── Scene/
│   ├── Serialization/
│   ├── Terrain/
│   ├── TileEngine/
│   ├── ToolFramework/
│   ├── UI/
│   └── Window/
├── DungeonServer/    # Authoritative server logic, matchmaking, and persistence logic.
├── DungeonTools/     # CLI tools for asset packing, code generation, and CI/CD.
├── Examples/         # Sandbox examples for testing isolated engine features.
├── External/         # Precompiled external binaries/libraries.
├── Scripts/          # Build scripts, CI pipelines, setup scripts.
├── Tests/            # Unit, integration, and performance tests.
└── ThirdParty/       # Submodules or source of low-level dependencies.
```
