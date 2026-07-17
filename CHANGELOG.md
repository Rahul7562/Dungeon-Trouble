# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- **Platform Abstraction Layer:** Implemented a unified platform abstraction (Milestone 8).
  - Added `PlatformManager` utilizing strictly Dependency Injection to expose OS functionalities.
  - Implemented abstract interfaces: `ISystemInfo`, `IEnvironment`, `IProcess`, `ITime`, `IClipboard`, and `IDynamicLibrary`.
  - Created Windows backend implementation using Win32 API.
  - Created POSIX backend implementation using standard POSIX APIs (macOS/Linux).
  - Added CMake configurations and platform detection macros (`DT_PLATFORM_*`).
  - Added comprehensive Catch2 unit tests in `Tests/Platform`.
  - Authored `ADR-004-Platform-Abstraction.md` documenting architecture.
  - Authored `PLATFORM.md` containing porting guides and usage examples.

## Milestone 7
### Added
- **Configuration System:** Implemented a robust, layered configuration system (Milestone 7).
  - Added `ConfigurationManager` to orchestrate multiple providers based on priority.
  - Implemented `MemoryProvider`, `CommandLineProvider`, `EnvironmentProvider`, and `FileProvider`.
  - Created zero-overhead, strongly-typed cached configuration variables via `ConfigVar<T>`.
  - Added lightweight, custom parsers for basic INI, JSON, and TOML formatting.
  - Added support for configuration validation via lambdas attached to `ConfigVar`.
  - Added corresponding Catch2 unit tests in `Tests/Configuration`.
  - Authored `ADR-003-Configuration-System.md` documenting architecture and design decisions.

## Milestone 6

### Added
- `FileSystem` module providing platform-independent I/O.
- `Path` class for normalization and path operations.
- `File` and `Directory` abstractions using `std::error_code`.
- VFS (`VirtualFileSystem`) allowing directory mounting and aliasing.
- Stream classes (`FileStream`, `MemoryStream`, and reader/writers).
- `FileSystemWatcher` interface for hot-reloading support.
- Catch2 Unit Tests for the FileSystem module.
- `ADR-002-Filesystem.md`.

### Changed
- Root `CMakeLists.txt` updated to include FileSystem module.

### Fixed
- N/A

### Known Limitations
- The physical node path resolution in VFS is currently limited and will be expanded with Archive support.


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
