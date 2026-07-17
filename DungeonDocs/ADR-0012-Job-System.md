# ADR 0012: Job System Architecture

## Context
Milestone 12 requires the implementation of a Job System to serve as the preferred mechanism for asynchronous work throughout the engine, discouraging direct thread creation. The system must be scalable, high-performance, minimize synchronization, and support future components like Render Graph and Asset Pipeline.

## Decisions

### 1. Task-Graph Architecture
We implemented a task-graph job system using an atomic dependency counter (`IJob::m_UnfinishedDependencies`). Jobs are only submitted to the queue once their dependencies reach zero. This minimizes queue overhead compared to systems that queue jobs immediately and yield/block upon missing dependencies.

### 2. Work-Stealing Queues
The worker pool uses a "local LIFO, steal FIFO" approach:
- **Local Push/Pop (LIFO):** Workers push and pop jobs from the top of their own local queues. This improves cache locality because the most recently added job is likely "hot" in CPU cache.
- **Steal (FIFO):** When a worker is idle, it steals from the bottom of another worker's queue. This minimizes contention and ensures older, potentially larger jobs (which might spawn more jobs) are executed.
- Due to `-fno-exceptions` and the need to keep dependencies simple for this milestone, the queue uses a `std::deque` protected by a fine-grained `Threading::Mutex` rather than a full lock-free Chase-Lev deque.

### 3. Global Priority Queue
Jobs that are not pushed locally by a worker thread (e.g., jobs submitted from the main thread) fall back to a `GlobalQueue`. The global queue utilizes a priority queue to ensure Critical/High priority jobs are dispatched first when workers are idle.

### 4. Wait-Free Synchronization Primitives
We implemented a lightweight `Future<T>` and `Promise<T>` system using `Threading::Event` to support data-flow programming and cooperative waiting without the overhead of `std::future`.

### 5. Cooperative Cancellation
A `CancellationToken` struct provides a thread-safe way to request cancellation across complex job graphs using `Threading::AtomicBool`.

## Consequences
- **Positive:** The engine now has a scalable system for dispatching thousands of micro-tasks. The dependency model is explicit and predictable.
- **Negative:** The current `WorkStealingQueue` uses a mutex. While contention is minimal (workers rarely hit the same queue at the exact same time), a lock-free queue would provide higher throughput under extreme load. This can be addressed in an optimization pass later.

## Alternatives Considered
- **Thread Pool with Global Queue Only:** Rejected because a single global queue becomes a severe bottleneck (high lock contention) on high core-count CPUs.
- **Fiber-based Job System:** Rejected due to the complexity of context switching on multiple platforms and potential stack-smashing issues. A standard thread-based work-stealing system provides the right balance of performance and maintainability.
