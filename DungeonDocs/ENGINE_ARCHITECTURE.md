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
