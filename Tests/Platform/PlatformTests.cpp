#include "catch_amalgamated.hpp"
#include "Platform/PlatformManager.h"
#include "Core/Platform.h"
#include <thread>

using namespace DungeonEngine::Platform;
using namespace Core;

TEST_CASE("PlatformManager Initialization", "[Platform]") {
    PlatformManager manager;

    REQUIRE(manager.getSystemInfo() != nullptr);
    REQUIRE(manager.getEnvironment() != nullptr);
    REQUIRE(manager.getProcess() != nullptr);
    REQUIRE(manager.getTime() != nullptr);
    REQUIRE(manager.getClipboard() != nullptr);
}

TEST_CASE("SystemInfo Interface", "[Platform]") {
    PlatformManager manager;
    ISystemInfo* sysInfo = manager.getSystemInfo();

    CpuInfo cpu = sysInfo->getCpuInfo();
    REQUIRE(cpu.numCores > 0);
    REQUIRE(cpu.numLogicalProcessors > 0);

    MemoryInfo mem = sysInfo->getMemoryInfo();
    REQUIRE(mem.totalPhysicalMemoryBytes > 0);

    OsInfo os = sysInfo->getOsInfo();
    REQUIRE(os.name.empty() == false);

    Core::String arch = sysInfo->getArchitecture();
    REQUIRE(arch.empty() == false);

    Core::String compiler = sysInfo->getCompilerInfo();
    REQUIRE(compiler.empty() == false);
}

TEST_CASE("Environment Interface", "[Platform]") {
    PlatformManager manager;
    IEnvironment* env = manager.getEnvironment();

    Core::String exeDir = env->getExecutableDirectory();
    REQUIRE(exeDir.empty() == false);

    Core::String workDir = env->getWorkingDirectory();
    REQUIRE(workDir.empty() == false);

    // Test environment variables
    bool setResult = env->setEnvironmentVariable("DT_TEST_ENV", "12345");
    REQUIRE(setResult == true);

    auto getResult = env->getEnvironmentVariable("DT_TEST_ENV");
    REQUIRE(getResult.has_value() == true);
    REQUIRE(getResult.value() == "12345");
}

TEST_CASE("Time Interface", "[Platform]") {
    PlatformManager manager;
    ITime* time = manager.getTime();

    Core::f64 start = time->getAbsoluteTimeSeconds();
    time->sleep(50); // sleep for 50ms
    Core::f64 end = time->getAbsoluteTimeSeconds();

    REQUIRE((end - start) >= 0.04); // Should be at least ~40ms depending on scheduler
}

TEST_CASE("DynamicLibrary Interface Creation", "[Platform]") {
    PlatformManager manager;
    auto lib = manager.createDynamicLibrary();
    REQUIRE(lib != nullptr);
    REQUIRE(lib->isLoaded() == false);
}

// We need a main function for Catch2 if we don't link Catch2WithMain
