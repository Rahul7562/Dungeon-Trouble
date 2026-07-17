# Platform Abstraction Layer

The Platform module provides a strict, interface-first abstraction over all operating system-specific APIs. By ensuring the engine only interacts with these abstract interfaces, we guarantee that DungeonTrouble remains highly portable and modular.

## Architecture

The system is centered around the `PlatformManager`, which is instantiated early in the engine lifecycle (typically injected via the `ServiceLocator`). The manager acts as a factory and container for the various platform subsystems.

### Core Interfaces:
- `ISystemInfo`: Hardware capabilities, RAM, CPU threads, OS details.
- `IEnvironment`: User directories, application data folders, environment variables.
- `IProcess`: Executing external processes and engine exit commands.
- `ITime`: High-resolution monotonically increasing timers.
- `IClipboard`: Getting and setting system clipboard text.
- `IDynamicLibrary`: Loading `.dll`, `.so`, or `.dylib` files and resolving function pointers.

## Usage Examples

```cpp
#include "Platform/PlatformManager.h"
#include "Platform/ITime.h"
#include "Platform/IEnvironment.h"
#include "Core/ServiceLocator.h"

void someEngineFunction() {
    auto platform = Core::ServiceLocator::Get<Platform::PlatformManager>();

    // Get high resolution time
    double currentTime = platform->getTime()->getAbsoluteTimeSeconds();

    // Find the save data directory
    Core::String saveDir = platform->getEnvironment()->getApplicationDataDirectory() + "/DungeonTrouble/Saves";
}
```

## Porting Guide (Adding a New Platform)

To support a new platform (e.g., a future console or WebAssembly):

1. **Detection:** Add a new macro to `DungeonEngine/Core/include/Core/Platform.h` (e.g., `DT_PLATFORM_CONSOLE_X`).
2. **Backend Directory:** Create a new folder `DungeonEngine/Platform/src/ConsoleX/`.
3. **Implement Interfaces:** Create a class for each interface (e.g., `ConsoleXSystemInfo : public ISystemInfo`) using the platform's specific SDK.
4. **Update Manager:** Edit `PlatformManager.cpp` to include your headers and instantiate your classes when your platform macro is defined.
5. **CMake Integration:** Update `DungeonEngine/Platform/CMakeLists.txt` to conditionally compile your new source files when targeting your platform.

*Never* use `#ifdef` scattered throughout gameplay or rendering code. All OS divergence must live within this module.
