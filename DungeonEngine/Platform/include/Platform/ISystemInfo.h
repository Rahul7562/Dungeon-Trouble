#pragma once
#include "Core/Types.h"

namespace DungeonEngine::Platform {

    struct CpuInfo {
        Core::String vendor;
        Core::String model;
        Core::u32 numCores;
        Core::u32 numLogicalProcessors;
    };

    struct MemoryInfo {
        Core::u64 totalPhysicalMemoryBytes;
        Core::u64 availablePhysicalMemoryBytes;
        Core::u64 totalVirtualMemoryBytes;
        Core::u64 availableVirtualMemoryBytes;
    };

    struct OsInfo {
        Core::String name;
        Core::String version;
        bool is64Bit;
    };

    class ISystemInfo {
    public:
        virtual ~ISystemInfo() = default;

        virtual CpuInfo getCpuInfo() const = 0;
        virtual MemoryInfo getMemoryInfo() const = 0;
        virtual OsInfo getOsInfo() const = 0;

        virtual Core::String getArchitecture() const = 0;
        virtual Core::String getCompilerInfo() const = 0;
    };

}
