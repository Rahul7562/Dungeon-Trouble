#include "Platform/PlatformManager.h"
#include "Core/Platform.h"

// Backend Includes
#if defined(DT_PLATFORM_WINDOWS)
    #include "Windows/PlatformWindows.h"
#elif defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)
    #include "Posix/PlatformPosix.h"
#endif

namespace DungeonEngine::Platform {

    struct PlatformManager::Impl {
        std::unique_ptr<ISystemInfo> systemInfo;
        std::unique_ptr<IEnvironment> environment;
        std::unique_ptr<IProcess> process;
        std::unique_ptr<ITime> time;
        std::unique_ptr<IClipboard> clipboard;
    };

    PlatformManager::PlatformManager() : m_Impl(std::make_unique<Impl>()) {
#if defined(DT_PLATFORM_WINDOWS)
        m_Impl->systemInfo = std::make_unique<WindowsSystemInfo>();
        m_Impl->environment = std::make_unique<WindowsEnvironment>();
        m_Impl->process = std::make_unique<WindowsProcess>();
        m_Impl->time = std::make_unique<WindowsTime>();
        m_Impl->clipboard = std::make_unique<WindowsClipboard>();
#elif defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)
        m_Impl->systemInfo = std::make_unique<PosixSystemInfo>();
        m_Impl->environment = std::make_unique<PosixEnvironment>();
        m_Impl->process = std::make_unique<PosixProcess>();
        m_Impl->time = std::make_unique<PosixTime>();
        m_Impl->clipboard = std::make_unique<PosixClipboard>();
#endif
    }

    PlatformManager::~PlatformManager() = default;

    ISystemInfo* PlatformManager::getSystemInfo() const {
        return m_Impl->systemInfo.get();
    }

    IEnvironment* PlatformManager::getEnvironment() const {
        return m_Impl->environment.get();
    }

    IProcess* PlatformManager::getProcess() const {
        return m_Impl->process.get();
    }

    ITime* PlatformManager::getTime() const {
        return m_Impl->time.get();
    }

    IClipboard* PlatformManager::getClipboard() const {
        return m_Impl->clipboard.get();
    }

    std::unique_ptr<IDynamicLibrary> PlatformManager::createDynamicLibrary() const {
#if defined(DT_PLATFORM_WINDOWS)
        return std::make_unique<WindowsDynamicLibrary>();
#elif defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)
        return std::make_unique<PosixDynamicLibrary>();
#else
        return nullptr;
#endif
    }

}
