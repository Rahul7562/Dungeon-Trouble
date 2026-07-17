#pragma once
#include "Core/Platform.h"
#if defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)

#include "Platform/ISystemInfo.h"
#include "Platform/IEnvironment.h"
#include "Platform/IProcess.h"
#include "Platform/ITime.h"
#include "Platform/IClipboard.h"
#include "Platform/IDynamicLibrary.h"

namespace DungeonEngine::Platform {

    class PosixSystemInfo : public ISystemInfo {
    public:
        CpuInfo getCpuInfo() const override;
        MemoryInfo getMemoryInfo() const override;
        OsInfo getOsInfo() const override;
        Core::String getArchitecture() const override;
        Core::String getCompilerInfo() const override;
    };

    class PosixEnvironment : public IEnvironment {
    public:
        Core::String getExecutableDirectory() const override;
        Core::String getWorkingDirectory() const override;
        Core::String getUserHomeDirectory() const override;
        Core::String getTemporaryDirectory() const override;
        Core::String getApplicationDataDirectory() const override;
        std::optional<Core::String> getEnvironmentVariable(const Core::String& name) const override;
        bool setEnvironmentVariable(const Core::String& name, const Core::String& value) override;
    };

    class PosixProcess : public IProcess {
    public:
        void exit(Core::i32 exitCode) override;
        bool execute(const Core::String& executablePath, const std::vector<Core::String>& arguments, Core::i32& outExitCode) override;
    };

    class PosixTime : public ITime {
    public:
        Core::f64 getAbsoluteTimeSeconds() const override;
        void sleep(Core::u32 milliseconds) override;
    };

    class PosixClipboard : public IClipboard {
    public:
        std::optional<Core::String> getText() const override;
        bool setText(const Core::String& text) override;
    };

    class PosixDynamicLibrary : public IDynamicLibrary {
    public:
        ~PosixDynamicLibrary() override;
        bool load(const Core::String& path) override;
        void unload() override;
        void* getSymbol(const Core::String& symbolName) const override;
        bool isLoaded() const override;
    private:
        void* m_Handle = nullptr;
    };

}
#endif
