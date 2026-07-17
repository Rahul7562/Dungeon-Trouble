## Milestone 5

### Added
- Modular Diagnostics framework in `DungeonEngine/Diagnostics`.
- `Logger` subsystem supporting log levels, categories, and multiple sinks (`ConsoleSink`, `FileSink`).
- Robust `Assertion` framework supporting custom handlers and different assertion types (`DT_ASSERT`, `DT_DEBUG_ASSERT`, `DT_ENSURE`).
- `DiagnosticsManager` for tracking runtime messages, warnings, and errors for potential editor/console integration.
- `Profiler` foundation providing `ScopedTimer` and region markers (`DT_PROFILE_SCOPE`).
- `PerformanceCounters` tracking frame count, FPS, CPU time, and total allocated memory.
- `ADR-001-Diagnostics-Framework.md` detailing the diagnostics architecture.
- `DIAGNOSTICS.md` documenting philosophy, usage, and best practices.

### Changed
- `Core/Assert.h` now forwards to the new Diagnostics Assertion framework.
- Root `CMakeLists.txt` updated to include Diagnostics module and tests.

### Fixed
- N/A

### Known Limitations
- The Logging system utilizes simple `std::mutex` locking which may introduce overhead in heavily multi-threaded scenarios. A lock-free queue may be implemented later if profiling demands it.
- The Profiler currently provides a scaffold API and does not yet integrate with an external visualizer (e.g., Tracy).


## Milestone 4

### Added
- Implemented `MemoryUtils` with alignment and standard memory operation helpers.
- Added `MemoryCategory` enum for detailed allocation tagging (Core, Math, Renderer, Physics, Audio, Resources, Networking, Editor, UI, Gameplay).
- Created `IAllocator` abstract interface to standardize memory allocators.
- Implemented `LinearAllocator` for fast, append-only contiguous allocations.
- Implemented `StackAllocator` for LIFO allocations with marker rollback support.
- Implemented `PoolAllocator` for O(1) allocation and freeing of fixed-size blocks.
- Implemented `FreeListAllocator` for general-purpose variable-size allocations with block coalescing.
- Implemented `ArenaAllocator` to manage large chunks of OS memory.
- Implemented `MemoryManager` as a central singleton to track allocations, detect leaks, and route allocations.
- Added comprehensive Catch2 unit tests for all allocators and the memory manager.

### Changed
- Updated CMake configuration to include `DungeonEngine/Memory` and `Tests/Memory`.
- Integrated `DT_ASSERT` into the memory subsystem for robust error checking.

### Fixed
- N/A

### Known Limitations
- The `MemoryManager` currently expects manual tracking updates when custom allocators are used outside of `allocateFrom()`.
- Global new/delete operators are not yet overridden; reliance remains on explicit allocator use.
