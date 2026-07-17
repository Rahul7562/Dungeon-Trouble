# ADR 005: Window Management System

## Status
Accepted

## Context
As part of Milestone 9, we need to implement a platform-independent window management subsystem for DungeonTrouble. The system must provide a clean abstraction over native operating system windows (Windows, Linux, macOS), supporting future rendering backends (Vulkan, DirectX, OpenGL), editor windows, multiple displays, and multi-window workflows. It must isolate platform-specific code and follow the core Engine Constitution principles: Data-Oriented Design, no hardcoded values, and composition over inheritance.

## Decision

### Window Abstraction Philosophy
The `IWindow` interface provides an abstraction layer over native OS windows. It decouples the engine's higher-level systems (rendering, input) from OS-specific window messaging loops and APIs. It exposes functionality for creation, destruction, visibility (show/hide), state (minimize/maximize/restore), geometry (move/resize), and event polling. Native handle access is provided minimally as an opaque pointer (`void*` or similar) strictly for passing to the rendering subsystem (e.g., Vulkan surface creation) without leaking OS headers into public API.

### Ownership Model and Lifecycle
Windows are created, owned, and destroyed by the `WindowManager`. The `WindowManager` acts as a central registry for all active windows in the application. When a component requires a new window (e.g., separating an editor panel, or a multi-window debugging tool), it requests creation through the `WindowManager`, which returns a handle or pointer to an `IWindow` instance. The `WindowManager` maintains unique `std::unique_ptr<IWindow>` for internal ownership.
Lifecycle is strictly:
1. `WindowManager::createWindow()`
2. Initialization of OS-specific backend
3. Normal usage (Resize, Move, Poll Events)
4. `WindowManager::destroyWindow()` or destruction on manager shutdown.

### Multi-Window Architecture
The `WindowManager` supports multiple windows to facilitate future editor docking and IMGUI integration. One window is designated as the "Main Window" (typically the primary game viewport). The manager can iterate over all registered windows to pump events uniformly.

### Fullscreen Strategy & DPI Awareness
Window properties (`WindowProperties`) allow configuring fullscreen modes (exclusive fullscreen, borderless windowed, windowed). DPI scale is tracked per-window and per-monitor. `MonitorInfo` provides the abstraction for DPI querying, ensuring that the engine handles mixed-DPI multi-monitor setups gracefully by scaling UI or rendering resolution accordingly, querying the OS for per-monitor DPI scale.

### Monitor Abstraction
A `DisplaySystem` (integrated within `WindowManager` or Platform) handles enumeration of connected monitors (`MonitorInfo`). It tracks primary monitor, resolution, refresh rate, physical DPI, and work area (screen minus taskbars). This data informs the `WindowManager` when positioning or centering windows.

### Future Renderer Integration
The `IWindow` interface does NOT include rendering logic. It provides a `getNativeHandle()` method returning an opaque structure (e.g., `HWND` on Windows, `Window` on X11). The future `Renderer` subsystem will query this handle to create swapchains or surfaces. This complete decoupling ensures the windowing system does not need to link against Vulkan or DirectX libraries.

## Consequences
- **Positive**: Complete isolation from OS-specific headers in public APIs. Clean separation of concerns allows the renderer to be swapped easily.
- **Negative**: Requires careful abstraction of OS events into standard engine events (to be implemented in Milestone 13, but stubs are defined here).
- **Positive**: Native backend implementation can be stubbed initially for testing and later fleshed out per platform without breaking higher-level engine code.
