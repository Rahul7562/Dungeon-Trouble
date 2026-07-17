# ADR 004: Platform Abstraction Layer

## Status
Accepted (Milestone 8)

## Context
As DungeonTrouble targets multiple platforms (Windows, Linux, macOS, and potentially future consoles/mobile), we need a way to interact with the underlying operating system without polluting the engine's core logic with platform-specific code (e.g., `#ifdef _WIN32`). Direct usage of OS APIs scattered throughout the codebase leads to spaghetti code, difficult porting, and violates our modular architecture principles.

We need a unified, platform-agnostic interface for querying system info, interacting with the environment, high-resolution timing, process management, dynamic library loading, and clipboard access.

## Decision
We will implement an Interface-First Platform Abstraction Layer in the `DungeonEngine/Platform` module.

### Architecture & Design
1.  **Platform Abstraction Philosophy:** The engine must never expose operating system APIs outside the `Platform` module. All OS interactions are hidden behind stable, pure virtual interfaces.
2.  **Interface-First Design:** We define interfaces like `ISystemInfo`, `IEnvironment`, `ITime`, `IProcess`, `IDynamicLibrary`, and `IClipboard`. These define *what* the engine needs, not *how* it's done.
3.  **Module Layout:**
    *   `include/Platform/`: Contains all public interfaces (`ISystemInfo.h`, etc.) and `PlatformManager.h`.
    *   `src/`: Contains `PlatformManager.cpp` (which instantiates the correct backend based on compile-time flags) and subdirectories for backends (`Windows/`, `Posix/`).
4.  **Dependency Direction:** High-level modules (like Engine Core, Resources) depend on the Platform interfaces. The Platform module implementations depend on the OS headers. Low-level modules do not depend on high-level ones.
5.  **Future Platform Support Strategy:** Supporting a new platform (e.g., a console) simply requires creating a new subdirectory in `src/` (e.g., `ConsoleX/`), implementing the interfaces using that platform's SDK, and updating the CMake conditions. No engine logic needs to change.
6.  **Error Handling:** We continue to adhere to our `-fno-exceptions` policy. Platform operations that can fail will return `std::optional<T>` or `bool`, and we will use the Diagnostics framework to log critical OS-level failures.
7.  **Initialization Lifecycle:** A `PlatformManager` will be instantiated early in the engine startup sequence via Dependency Injection. It will manage the lifetime of the platform-specific implementations and provide access to them.

### Alternative Architectures Considered
*   **Compile-time Polymorphism (CRTP / Headers with `#ifdef` implementations):**
    *   *Pros:* Zero runtime overhead (no virtual function calls).
    *   *Cons:* Can lead to massive, hard-to-read header files filled with `#ifdef`s. Slower compile times. Harder to mock for unit testing.
*   **Selected: Runtime Polymorphism (Virtual Interfaces):**
    *   *Pros:* Clean separation of interface and implementation. Very easy to mock for tests. Clear boundaries.
    *   *Cons:* Slight runtime overhead for virtual function calls.
    *   *Justification:* The overhead of virtual calls for operations like getting system info, loading libraries, or reading environment variables is negligible, as these are typically not on the hot path (unlike rendering or physics). For high-frequency calls like `ITime::getNow()`, the overhead is acceptable for the architectural cleanliness, and if profiling shows it to be a bottleneck, we can devirtualize specific hot paths later.

## Consequences
*   **Positive:** The engine is cleanly decoupled from the OS. Porting to new platforms is a well-defined, isolated task. Unit testing is simplified via mocking.
*   **Negative:** Minor overhead from virtual function dispatch for platform calls.
