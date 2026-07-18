# AGENTS.md — Dungeon-Trouble

## Project Overview
DungeonEngine is a C++17 modular game engine targeting a 2.5D isometric dungeon-crawler (DungeonTrouble).
Current milestone: M12 (Job System). Next milestone: M13+ (Renderer abstraction, basic 2D drawing).

## Build System
- CMake 3.16+, C++17, `-fno-exceptions`
- Build: `mkdir build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Debug && cmake --build . -j$(nproc)`
- Tests: Catch2 (amalgamated) in `Tests/` — run via individual test executables
- All test executables are in `build/Tests/<Module>/<Module>Tests`

## Coding Standards
- `pragma once` for include guards
- `PascalCase` for classes/methods, `m_` prefix for members, `s_` for statics
- Interfaces prefixed with `I` (e.g., `IWindow`, `IAllocator`)
- `virtual ~IFoo() = default;` in all interface classes
- No exceptions (`-fno-exceptions` is set) — use `Core::Result<T>` for error handling
- `DT_ASSERT` / `DT_DEBUG_ASSERT` for assertions
- `DT_LOG_INFO/TRACE/WARN/ERROR` for logging (see Diagnostics)

## Working with the orchestrator
- State your plan explicitly before starting — don't begin edits until approved.
- On completion, list every file changed and why, in the final session message.
- If a requirement is ambiguous, ask rather than guessing — don't invent scope.
- Build must pass: `cmake --build build -j$(nproc)` with zero errors.
- All existing tests must pass after your changes.
- Match existing code conventions exactly — no new patterns.
