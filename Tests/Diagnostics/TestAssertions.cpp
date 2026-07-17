#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Diagnostics/Assertion.h"

using namespace DungeonEngine::Diagnostics;

static bool s_assertionHit = false;

static void TestAssertionHandler(const char* expr, const char* msg, const char* file, int line) {
    (void)expr; (void)msg; (void)file; (void)line;
    s_assertionHit = true;
}

TEST_CASE("Assertions trigger custom handler", "[Assertion]") {
    Assertion::setHandler(TestAssertionHandler);

    s_assertionHit = false;
    DT_ASSERT_MSG(1 == 2, "Test failed intentionally");
    REQUIRE(s_assertionHit == true);

    s_assertionHit = false;
    DT_ASSERT_MSG(1 == 1, "Test passed");
    REQUIRE(s_assertionHit == false);

    Assertion::setHandler(nullptr); // Reset to default
}
