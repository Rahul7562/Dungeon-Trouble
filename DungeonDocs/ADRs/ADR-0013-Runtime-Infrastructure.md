# ADR 0013: Runtime Infrastructure (Events, Resources, Assets)

## Status
Accepted

## Context
We are implementing Phase 2 of DungeonTrouble's engine development: the Runtime Infrastructure. This includes the Event & Messaging System, Resource Management System, and Asset Pipeline. These systems must form a cohesive foundation for future subsystems like ECS, Renderer, and Audio. They need to be multithread-ready, high-performance, and avoid exceptions.

## Decision

### 1. Event & Messaging System
We will implement an `EventBus` that supports multiple dispatch modes:
- **Immediate Dispatch**: Direct synchronous function calls for low-latency systems.
- **Deferred/Queued Dispatch**: Events are added to thread-safe queues and processed later (e.g., at the beginning of a frame) to avoid reentrancy and lock contention.
- **Cross-Thread Messaging**: Specific queues for routing messages to worker threads or back to the main thread.
- **Filtering & Categories**: Events will have `EventCategory` and `EventPriority` to allow listeners to subscribe only to what they need, processed in order of priority.
- **Memory Strategy**: Events are value types or heap-allocated with a pool allocator if deferred to avoid dynamic allocation overhead.

### 2. Resource Management System
- **Resource Handles**: We will use typed, ref-counted `ResourceHandle<T>` objects (wrapping an internal ID/index) rather than raw pointers to ensure safe deferred destruction.
- **Asynchronous Loading**: The `ResourceManager` will integrate with the Job System to load files and decode them asynchronously. It returns a future-like handle that reports state (`Pending`, `Loaded`, `Failed`).
- **Cache Policies**: A unified `ResourceCache` will track reference counts. Unreferenced resources will be kept alive based on a policy (e.g., LRU cache with memory budget) before eviction.

### 3. Asset Pipeline
- **Asset Registry**: A persistent registry tracking `AssetID` (UUID) to file paths and metadata.
- **Import Framework**: Importers translate raw formats (e.g., PNG, glTF) into engine-optimized binary formats during an offline or background step.
- **Dependency Tracking**: The pipeline will maintain a dependency graph to ensure assets are rebuilt incrementally when source files change.

## Consequences
- **Positive**: Strict decoupling of systems via events. Predictable memory and thread-safe asynchronous loading for resources. Robust metadata tracking for assets.
- **Negative**: Increased complexity in debugging deferred events. Resource handles require careful usage to avoid leaks if ref counts are mismanaged.

## Trade-offs
- **Ref-counted Handles vs ECS Components**: We chose ref-counted handles for resources to allow non-ECS systems (like UI) to easily hold resource lifetimes.
- **Centralized EventBus vs Direct Observers**: A central bus adds a slight overhead but dramatically reduces coupling between modules.
