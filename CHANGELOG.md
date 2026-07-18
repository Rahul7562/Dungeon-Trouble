# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## Milestone 12

### Fixed (Pre-Rendering Phase Hardening)
A full static + dynamic audit was run across all engine modules (Core, Math, Memory, Diagnostics,
FileSystem, Configuration, Platform, Window, Input, Threading, Jobs) before starting the Rendering
milestone (M21-M30). All findings were fixed via Jules-driven implementation sessions, verified by a
clean `-Wall -Wextra -Wpedantic` build and a green full test suite (11 suites, all passing). Merged PRs:
#48, #47, #50, #53.

- **Critical build break — Math test linker error:** `Tests/Math/MathModuleTests.cpp` called
  `DungeonEngine::Math::initMath()`, a symbol that had been removed from `MathModule.cpp`. This caused
  an undefined-reference linker failure that prevented the entire `MathTests` target from building.
  Removed the dead test and its forward declaration. (PR #48)
- **Undefined behavior — `FileStream` const-cast on `std::fstream`:** `GetPosition()` and `GetLength()`
  used `const_cast<std::fstream&>(m_File)` inside `const` methods. Made `m_File` `mutable` and dropped
  all `const_cast` usage. Also reordered `FileStream` member declarations (`m_Path`, `m_Mode`,
  `m_File`) to eliminate a `-Wreorder` warning. (PR #47)
- **Security — VFS path traversal:** `PhysicalVFSNode::ResolvePhysical` blindly appended virtual paths
  to the physical root (`../../etc/passwd` escape). It now returns `Core::Result<Path>`, normalizes the
  resolved path, and rejects any path that escapes the mounted root. `Exists`/`OpenRead`/`OpenWrite`
  propagate the error. `VirtualFileSystem::ResolvePhysicalPath` now returns the real physical path for
  `PhysicalVFSNode` mounts (was previously dead code that always errored) and the unused-variable
  warning is gone. A regression test (`Tests/FileSystem/src/Test_VFS.cpp`) asserts traversal is blocked.
  (PR #50)
- **Missing standard-library includes:** Added the correct `<string>`, `<vector>`, `<mutex>`,
  `<atomic>`, `<thread>` includes to 15 `.cpp` files that relied on transitive includes. Prevents
  breakage under stricter/isolated builds. (PR #48)
- **Compiler-warning cleanup (`-Wall -Wextra -Wpedantic`):** Silenced all remaining warnings in the
  touched files using the project's `(void)param;` convention — unused parameters in `Providers.cpp`,
  `Layer.h`, `SimulatedDevices.h`, `PlatformPosix.cpp`, `Test_Engine.cpp`; the `int`→`size_t` sign
  mismatch in `Thread::PlatformSetAffinity`; `-Wmissing-field-initializers` in `InputTests.cpp`; and
  unused variables in `MemoryTests.cpp`. The full engine now builds warning-free under
  `-Wall -Wextra -Wpedantic`. (PR #53)
- **Repo hygiene:** Deleted stale scratch files `commit_msg.txt` and `pr_description.md` from the repo
  root; added `AGENTS.md` (orchestrator workflow contract) and ignored the `build/` directory via
  `.gitignore`. Removed all feature branches — only `main` remains. (PR #50, #48, manual)

### Changed
- `PhysicalVFSNode::ResolvePhysical` signature changed from `Path ResolvePhysical(...)` to
  `Core::Result<Path> ResolvePhysical(...)` and is now `public` (was `private`). Callers must check
  `IsError()` before using the result.
- `PhysicalVFSNode` gained a `const Path& GetPhysicalRoot() const` accessor.

### Added
- **Job System:** Implemented a scalable, high-performance job scheduling framework.
  - Added `IJob` interface with atomic dependency tracking and priority support.
  - Implemented `JobScheduler` to manage worker pools and coordinate shutdown.
  - Implemented `WorkerThread` utilizing a local LIFO, steal FIFO work-stealing strategy.
  - Created `WorkStealingQueue` and priority-based `GlobalQueue`.
  - Added `ParallelFor` utility to easily partition ranges into multiple jobs.
  - Added lightweight, exception-free `Future<T>` and `Promise<T>` primitives for task synchronization.
  - Added `CancellationToken` for cooperative cancellation.
  - Created comprehensive Catch2 unit tests in `Tests/Jobs`.
  - Authored `ADR-0012-Job-System.md` detailing the task-graph architecture.

### Added
- **Threading System (Milestone 11):** Implemented a modern, portable, high-performance threading framework.
  - Added `IThread` interface and RAII-based `Thread` implementation utilizing `std::thread` and platform native hooks.
  - Added C++17 polyfills for C++20 concurrency primitives: `Semaphore`, `BinarySemaphore`, `Latch`, and `Barrier`.
  - Added standard wrappers for `Mutex`, `RecursiveMutex`, `SharedMutex`, `ConditionVariable`, and `Event`.
  - Added utility classes for `AtomicCounter`, `AtomicFlag`, `AtomicBool`, and `Timing`.
  - Added `ThreadManager` for global thread registration and coordinated shutdown.
  - Added `ThreadContext` providing thread-local storage for thread naming and diagnostics.
  - Added comprehensive Catch2 unit tests in `Tests/Threading`.
  - Authored `ADR-0011-Threading-System.md` documenting architecture and design decisions.

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

## [0.9.0] - 2024-XX-XX
### Added
- **Window Management System (Milestone 9):**
  - Added `IWindow` abstract interface for cross-platform window management.
  - Implemented `WindowManager` to handle creation, destruction, and lifecycle of multiple windows.
  - Added `WindowProperties` and `MonitorInfo` structs.
  - Defined dummy native backends for Windows, Linux, and macOS.
  - Added multi-window and monitor enumeration support.
  - Added `WindowTests` validating window lifecycle and property updates.
  - Added `ADR-005-Window-Management.md` documenting architecture and design decisions.

## [0.10.0] - 2024-05-18

### Added
- **Input Subsystem:** Implemented a platform-independent input framework supporting keyboard, mouse, and gamepads.
- Extensible device interfaces (`IKeyboard`, `IMouse`, `IGamepad`) ready for future touch/VR expansion.
- Simulated input devices for rigorous unit testing decoupled from the OS.
- Context-based input mapping system to decouple logical actions from raw physical inputs.
- Defined explicit input types, enums (e.g. `KeyCode`, `GamepadButton`), and standardized modifiers.
- Added ADR 006 detailing the Input System architecture, state management, and thread-safety considerations.
