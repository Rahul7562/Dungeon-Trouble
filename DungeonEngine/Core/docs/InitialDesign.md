# Core Engine Library - Initial Design

## Overall Architecture
The `Core` module provides the fundamental building blocks for all other modules in `DungeonEngine`. It abstracts platform specifics, provides low-level utilities (timing, hashing, UUIDs), establishes common types (Result, strong typedefs), and defines the lifecycle and structural layout of the engine via `Engine`, `Application`, `Module`, and `Layer` abstractions.

## Responsibilities of Key Classes
- **Application:** The user-defined executable entry point. Holds the `Engine` instance.
- **Engine:** The central manager. Initializes subsystems, ticks the main loop, manages the `LayerStack`, and owns the instance of `ServiceLocator`.
- **Module:** Interface for engine subsystems (e.g., Renderer, Audio). Enforces `Init()`, `Update()`, and `Shutdown()` hooks.
- **Layer / LayerStack:** Manages logical updates and event propagation order (e.g., UI Layer vs. Gameplay Layer). Layers hold a pointer to the `Engine` to access subsystems.
- **ServiceLocator / Dependency Injection:** An instance-based class (owned by `Engine`) that provides access to core modules without explicit global mutable state or singleton anti-patterns, keeping dependencies interface-based and swappable.
- **Platform/Compiler/OS Detection:** Macros mapping OS specific defines to generic `DT_PLATFORM_*` macros.
- **Clock / Timers:** Platform-independent high-resolution timing and delta time computation.
- **UUID:** Generates 64-bit pseudo-random unique identifiers for entities and resources, utilizing thread-local generators.

## Subsystem Relationships
- `Application` instantiates and owns `Engine`.
- `Engine` owns a `LayerStack` and an instance of `ServiceLocator`.
- The `ServiceLocator` manages the lifetime and registration of `Module` implementations.
- `Layer` instances utilize utilities (Timers, UUIDs) and query the `Engine`'s `ServiceLocator` for systems.

## Future Extensibility
Every subsystem is abstracted behind pure virtual interfaces (`IModule`). The `ServiceLocator` allows replacing an `Audio` module with a `DummyAudio` module for headless servers without changing the dependent code.

## Dependency Graph
`Core` -> `[Standard Library]` (No other engine modules)
`Platform` / `Input` / `Renderer` -> `Core`
