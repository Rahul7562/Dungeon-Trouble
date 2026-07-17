#include <catch_amalgamated.hpp>
#include <Math/MathUtils.h>

using namespace DungeonEngine::Math;

TEST_CASE("MathUtils Basic Functionality", "[Math][MathUtils]") {
    SECTION("Constants") {
        REQUIRE(nearlyEqual(PI, 3.14159265f));
        REQUIRE(nearlyEqual(PI_2, 1.57079632f));
        REQUIRE(nearlyEqual(TAU, 6.2831853f));
    }

    SECTION("Absolute") {
        REQUIRE(DungeonEngine::Math::abs(-5) == 5);
        REQUIRE(DungeonEngine::Math::abs(5) == 5);
        REQUIRE(DungeonEngine::Math::abs(0) == 0);
        REQUIRE(nearlyEqual(DungeonEngine::Math::abs(-3.14f), 3.14f));
    }

    SECTION("Min/Max") {
        REQUIRE(min(1, 2) == 1);
        REQUIRE(min(2, 1) == 1);
        REQUIRE(max(1, 2) == 2);
        REQUIRE(max(2, 1) == 2);
    }

    SECTION("Clamp") {
        REQUIRE(clamp(5, 0, 10) == 5);
        REQUIRE(clamp(-5, 0, 10) == 0);
        REQUIRE(clamp(15, 0, 10) == 10);
    }

    SECTION("Saturate") {
        REQUIRE(nearlyEqual(saturate(0.5f), 0.5f));
        REQUIRE(nearlyEqual(saturate(-1.0f), 0.0f));
        REQUIRE(nearlyEqual(saturate(2.0f), 1.0f));
    }

    SECTION("Sign") {
        REQUIRE(sign(5) == 1);
        REQUIRE(sign(-5) == -1);
        REQUIRE(sign(0) == 0);
    }

    SECTION("Degrees and Radians") {
        REQUIRE(nearlyEqual(toRadians(180.0f), PI));
        REQUIRE(nearlyEqual(toDegrees(PI), 180.0f));
    }

    SECTION("NearlyEqual") {
        REQUIRE(nearlyEqual(1.0f, 1.0000001f));
        REQUIRE_FALSE(nearlyEqual(1.0f, 1.01f));
    }

    SECTION("Wrap") {
        REQUIRE(wrap(15, 0, 10) == 5);
        REQUIRE(wrap(-5, 0, 10) == 5);
        REQUIRE(nearlyEqual(wrap(15.5f, 0.0f, 10.0f), 5.5f));
        REQUIRE(nearlyEqual(wrap(-2.5f, 0.0f, 10.0f), 7.5f));
    }

    SECTION("PingPong") {
        REQUIRE(nearlyEqual(pingPong(2.0f, 10.0f), 2.0f));
        REQUIRE(nearlyEqual(pingPong(12.0f, 10.0f), 8.0f));
        REQUIRE(nearlyEqual(pingPong(22.0f, 10.0f), 2.0f));
    }
}
