# ADR 0011: Threading System Architecture

## Context
Milestone 11 dictates the creation of a modern, portable, high-performance threading framework to act as the foundation for the engine's asynchronous systems (Job System, Resource Management). The system must prioritize correctness, maintainability, and portability, remaining strictly platform-independent in its public API and exception safe in a `-fno-exceptions` environment.

## Decision
We chose a hybrid architecture:
1.  **Interfaces (`IThread`)**: We expose a pure virtual interface for thread management, ensuring tight control over the thread's lifecycle via RAII.
2.  **Implementation (`std::thread` + Native extensions)**: We utilize C++17 `std::thread` for cross-platform execution and synchronization (`std::mutex`, `std::condition_variable`), taking advantage of standard library portability. For engine-specific necessities not in the C++17 thread spec (Naming, Affinity pinning, Priority), we extract the thread's `native_handle()` and implement OS-specific hooks (e.g. `pthread_setaffinity_np` for Linux/Mac).
3.  **Synchronization Primitives**: C++20 primitives like `std::semaphore`, `std::latch`, and `std::barrier` were manually polyfilled using standard `std::mutex` and `std::condition_variable` to remain compliant with the engine's strict C++17 requirement.
4.  **Ownership Model**: The `ThreadManager` tracks threads and handles coordinated shutdown, but the creating systems retain lifecycle ownership via `std::shared_ptr`.
5.  **Thread Local Storage**: Diagnostic contexts, such as the thread name, are stored securely in `thread_local` structures, isolated from global mutable state.

## Trade-offs
-   *Cost*: Polyfilling C++20 concurrency structures required explicit internal testing and validation.
-   *Benefit*: High portability by relying predominantly on the C++17 standard library while ensuring future-proofing for hardware concurrency binding.

## Future Implications
This threading abstraction acts as the direct prerequisite for Milestone 12 (Job System). The Job System will leverage the `Barrier`, `Semaphore`, and `AtomicCounter` primitives extensively.
