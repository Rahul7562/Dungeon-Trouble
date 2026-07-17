#include <catch_amalgamated.hpp>
#include <Math/Interpolation.h>

using namespace DungeonEngine::Math;

TEST_CASE("Interpolation Functionality", "[Math][Interpolation]") {
    SECTION("Lerp") {
        REQUIRE(nearlyEqual(lerp(0.0f, 10.0f, 0.5f), 5.0f));
    }
    SECTION("InverseLerp") {
        REQUIRE(nearlyEqual(inverseLerp(0.0f, 10.0f, 5.0f), 0.5f));
    }
    SECTION("SmoothStep") {
        REQUIRE(nearlyEqual(smoothStep(0.0f), 0.0f));
        REQUIRE(nearlyEqual(smoothStep(1.0f), 1.0f));
        REQUIRE(nearlyEqual(smoothStep(0.5f), 0.5f)); // at exactly 0.5, hermite is 0.5
    }
}
