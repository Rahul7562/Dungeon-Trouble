#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Core/Timer.h"
#include <thread>

TEST_CASE("Timer basics") {
    Core::Timer timer;
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    REQUIRE(timer.ElapsedMilliseconds() >= 45.0); // Buffer for OS scheduling
}
