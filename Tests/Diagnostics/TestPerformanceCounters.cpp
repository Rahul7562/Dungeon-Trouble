#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Diagnostics/PerformanceCounters.h"

using namespace DungeonEngine::Diagnostics;

TEST_CASE("Performance Counters tracking", "[Counters]") {
    PerformanceCounters::initialize();

    REQUIRE(PerformanceCounters::getFrameCount() == 0);
    PerformanceCounters::incrementFrame();
    REQUIRE(PerformanceCounters::getFrameCount() == 1);

    PerformanceCounters::addAllocatedMemory(1024);
    REQUIRE(PerformanceCounters::getTotalAllocatedMemory() == 1024);

    PerformanceCounters::removeAllocatedMemory(512);
    REQUIRE(PerformanceCounters::getTotalAllocatedMemory() == 512);

    PerformanceCounters::updateFPS(0.016f); // ~60fps
    REQUIRE(PerformanceCounters::getFPS() > 0.0f);
}
