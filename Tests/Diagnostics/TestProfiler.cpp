#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Diagnostics/Profiler.h"

using namespace DungeonEngine::Diagnostics;

TEST_CASE("Profiler API does not crash", "[Profiler]") {
    Profiler::initialize();

    REQUIRE_NOTHROW(Profiler::beginFrame());
    {
        DT_PROFILE_SCOPE("TestScope");
    }
    REQUIRE_NOTHROW(Profiler::endFrame());

    Profiler::shutdown();
}
