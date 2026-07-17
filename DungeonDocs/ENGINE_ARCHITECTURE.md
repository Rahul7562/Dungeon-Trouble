# Engine Architecture

## 1. Subsystem Overview
DungeonEngine is designed as a modular, multithread-ready platform.

### Core Modules
* **Core**: Type definitions, assertions, logging, string hashing, and utility macros.
* **Math**: Custom SIMD-optimized math library (vectors, matrices, quaternions).
* **Memory**: Custom allocators (Linear, Pool, Stack).
* **Platform**: OS-specific abstractions (File I/O, Threading, Time).
* **Window**: Window creation and event pump.
* **Input**: Keyboard, Mouse, and Gamepad polling/events.
* **Audio**: 3D and 2D spatial audio subsystem.
* **Renderer**: Abstracted render backend (Vulkan/DirectX/OpenGL capable).
* **Resources**: Asynchronous asset management (Textures, Models, Audio clips).
* **Scene**: Scene graph and management.
* **ECS**: High-performance Entity-Component-System for game logic.
* **Animation**: Skeletal and sprite animation blending.
* **Physics**: 2D/3D collision detection and resolution.
* **Networking**: Reliable UDP and TCP layers for MMORPG server replication.
* **UI**: Immediate mode or retained mode UI for tools and game HUD.
* **Editor**: Custom engine editor interface.
* **Scripting**: Optional lightweight scripting layer.
* **Tools**: Asset packers and build tools.
* **Server**: Dedicated headless MMORPG server executable.

## 2. Initialization and Shutdown Order
Strict ordering ensures dependencies are ready when needed:
1. Memory
2. Core/Logging
3. Platform/Window
4. Input
5. Renderer
6. Audio
7. Resources
8. ECS/Scene

Shutdown occurs in the exact reverse order.

## 3. Future Expansion Strategy
The architecture uses abstract interfaces for core services (e.g., `IRenderer`, `IAudioDevice`). Future expansion involves writing new backend implementations without changing high-level engine logic.

## Math Library Architecture
The `DungeonEngine::Math` module provides a production-quality, dependency-free mathematics library targeting C++17 without exceptions.

### Coordinate System Conventions
- **Handedness**: Right-handed coordinate system.
- **Up Axis**: Y-up (Standard for 2.5D Isometric and 3D scenes).
- **Forward Axis**: -Z (Negative Z points into the screen).
- **Matrix Layout**: Column-major (compatible with Vulkan/OpenGL natively).

### Precision Strategy
- **Floating-Point Types**: `float` is standard across the library (e.g., `Vector3`, `Matrix4`) to ensure SIMD readiness and memory efficiency.
- **Epsilon Comparisons**: `nearlyEqual` is used globally for float comparisons to account for floating-point drift. Epsilon defaults to `std::numeric_limits<float>::epsilon()`.

### Performance & SIMD Readiness
- Most small types (`Vector2`, `Vector3`, `Vector4`, `Matrix3`, `Quaternion`) are implemented as `constexpr` and `noexcept` to maximize compile-time evaluation and runtime performance.
- The structure alignment allows for seamless integration of SIMD intrinstics (SSE/AVX or NEON) in future milestones without altering the public API.
- Math functions are pass-by-value for small structures (`Vector2`, `Vector3`) where optimal (registers) and pass-by-const-reference for larger structures (`Matrix4`).

## Memory Subsystem Architecture

The Memory Subsystem provides high-performance, predictable memory management isolated from gameplay logic.

### 1. Ownership Model and Lifetime Rules
* **MemoryManager:** Acts as the central singleton tracker. It does *not* natively own all allocator memory unless explicitly passed an allocator (like an `ArenaAllocator`) that it cleans up. Typically, allocators are stack-allocated in scopes or owned by specific engine modules.
* **Allocators:** All allocators derive from `IAllocator`. They are responsible for the raw memory blocks they manage. Memory obtained from an allocator *must* be returned to that specific allocator instance.

### 2. Allocation Strategies
* **Linear Allocator:** Fast, sequential allocations. Cannot be freed individually; the entire allocator must be reset via `clear()`. Best for per-frame or highly temporary data.
* **Stack Allocator:** LIFO (Last-In, First-Out) allocations. Supports freeing the most recent allocation or rolling back to a saved marker. Best for scoped workloads.
* **Pool Allocator:** Fixed-size chunk allocations. O(1) alloc/free times. Best for spawning entities, particles, or repetitive game objects.
* **Free List Allocator:** General-purpose, variable-size allocations. Reuses freed blocks and coalesces adjacent free memory to combat fragmentation. Best for varied, long-lived allocations.
* **Arena Allocator:** Requests large blocks (chunks) from the OS and linearly allocates out of them. Cannot free individually. When full, it requests a new chunk. Best used as a backend for other allocators.

### 3. Alignment Policy
Every allocator requires alignment inputs to ensure data safely lands on processor-optimal boundaries. The system provides `MemoryUtils::alignForward` to calculate adjustment paddings automatically.

### 4. Debug vs Release Behavior
* **Debug Mode:** Tracking is heavily enabled. The `MemoryManager` records exact pointer locations, categories, and sizes in an `std::unordered_map`. At engine shutdown, `checkLeaks()` is invoked, dumping information regarding any unfreed memory blocks. `StackAllocator` maintains a history of allocations to enforce strict LIFO free validation.
* **Release Mode:** Pointer tracking and leak detection are compiled out to eliminate `unordered_map` overhead. Statistical counters (e.g., total allocations, bytes per category) might still function if invoked, but fine-grained map lookups disappear for maximum performance.

### 5. Extension Points
New allocation strategies can easily be integrated by inheriting from `DungeonEngine::Memory::IAllocator` and fulfilling the interface contract. The `MemoryManager` easily digests new categories by updating `MemoryCategory.h`.
