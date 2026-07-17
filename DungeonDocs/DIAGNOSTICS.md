# Diagnostics Framework

## Overview
The Diagnostics module provides the foundation for logging, debugging, profiling, and performance tracking in DungeonTrouble. It is designed to be low-overhead, modular, and thread-safe.

## Architecture

*   **Logger (`Log.h`, `LogSink.h`)**: The central logging facility. It routes log messages to multiple sinks (Console, File) and supports runtime level filtering.
*   **Assertions (`Assertion.h`)**: Macros and handlers for validating runtime invariants.
*   **DiagnosticsManager (`DiagnosticsManager.h`)**: A system for collecting warnings and errors from subsystems, useful for displaying in an in-game console or editor.
*   **Profiler (`Profiler.h`)**: Provides scoped timers and region markers for performance analysis.
*   **PerformanceCounters (`PerformanceCounters.h`)**: Tracks global statistics like FPS, frame count, and memory allocation.

## Usage Examples

### Logging
```cpp
#include "Diagnostics/Log.h"

// Initialize early in the engine startup
DungeonEngine::Diagnostics::Logger::initialize();
DungeonEngine::Diagnostics::Logger::setGlobalLevel(DungeonEngine::Diagnostics::LogLevel::Info);

DT_LOG_INFO("Core", "Engine initialized successfully. version: %d", 1);
DT_LOG_ERROR("Audio", "Failed to load sound file.");
```

### Assertions
```cpp
#include "Diagnostics/Assertion.h"
// Or simply include Core/Assert.h

void update(float dt) {
    DT_ASSERT_MSG(dt > 0.0f, "Delta time must be positive!");

    // DT_ENSURE evaluates the condition even in Release builds.
    if (!DT_ENSURE(resourceManager.isLoaded())) {
        return;
    }
}
```

### Profiling
```cpp
#include "Diagnostics/Profiler.h"

void RenderSystem::render() {
    DT_PROFILE_SCOPE("RenderSystem::render");
    // ... rendering code ...
}
```

## Best Practices
1.  **Filter Aggressively**: Set the global log level to Warning or Error in release builds.
2.  **Use Subsystem Categories**: Always provide a meaningful category string to `DT_LOG_*`.
3.  **Profile Before Optimizing**: Use `DT_PROFILE_SCOPE` to identify hot paths before modifying code for performance.
4.  **Avoid String Allocations in Logging**: Prefer standard C-style formatting (`%s`, `%d`) in log macros to avoid temporary `std::string` allocations in hot paths.
