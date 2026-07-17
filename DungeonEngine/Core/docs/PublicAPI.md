# Public API

## Utilities
- `Core::UUID`: Generate a 64-bit globally unique ID. Thread-safe.
- `Core::Timer`: Measure elapsed time.
- `Core::FrameTimer`: Ticks the engine and calculates delta time.
- `Core::HashString`: Compile-time FNV-1a hash.

## Architecture
- `Core::Application`: Base class to inherit from to start the game.
- `Core::Engine`: Manages the main game loop (`Run()`, `Stop()`) and owns the core subsystems.
- `Core::Layer`: Base class for modular logic (e.g., `UILayer`, `GameLayer`). Has access to the `Engine` via `m_Engine`.
- `Core::ServiceLocator`: Registers and fetches core subsystems (e.g., `engine.GetServiceLocator().GetService<IRenderer>()`). It is an instanced class, not a global singleton.
- `Core::IModule`: Interface for major engine subsystems.

## Error Handling
- `Core::Result<T, E>`: Encapsulates success values or error strings. Uses C++17 `std::variant`.
- `DT_ASSERT`: Custom assert macro that triggers debug breaks.
