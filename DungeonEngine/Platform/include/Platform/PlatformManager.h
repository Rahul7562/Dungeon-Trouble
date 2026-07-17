#pragma once
#include "Platform/ISystemInfo.h"
#include "Platform/IEnvironment.h"
#include "Platform/IProcess.h"
#include "Platform/ITime.h"
#include "Platform/IClipboard.h"
#include "Platform/IDynamicLibrary.h"
#include <memory>

namespace DungeonEngine::Platform {

    // PlatformManager is instantiated and registered via Dependency Injection (ServiceLocator or similar)
    // It owns the platform-specific backend implementations and exposes them via the interfaces.
    class PlatformManager {
    public:
        PlatformManager();
        ~PlatformManager();

        PlatformManager(const PlatformManager&) = delete;
        PlatformManager& operator=(const PlatformManager&) = delete;

        ISystemInfo* getSystemInfo() const;
        IEnvironment* getEnvironment() const;
        IProcess* getProcess() const;
        ITime* getTime() const;
        IClipboard* getClipboard() const;

        // Factory for dynamic libraries as multiple can be loaded at once
        std::unique_ptr<IDynamicLibrary> createDynamicLibrary() const;

    private:
        struct Impl;
        std::unique_ptr<Impl> m_Impl;
    };

}
