#include <catch_amalgamated.hpp>
#include <Math/Color.h>

using namespace DungeonEngine::Math;

TEST_CASE("Color Functionality", "[Math][Color]") {
    SECTION("Constructors and Defaults") {
        Color c;
        REQUIRE(nearlyEqual(c.r, 0.0f));
        REQUIRE(nearlyEqual(c.a, 1.0f));

        Color red = Color::red();
        REQUIRE(nearlyEqual(red.r, 1.0f));
        REQUIRE(nearlyEqual(red.g, 0.0f));

        Color black = Color::black();
        REQUIRE(nearlyEqual(black.r, 0.0f));
        REQUIRE(nearlyEqual(black.g, 0.0f));
        REQUIRE(nearlyEqual(black.b, 0.0f));
        REQUIRE(nearlyEqual(black.a, 1.0f));
    }

    SECTION("Hex Conversion") {
        Color c = Color::fromHex(0xFF0000FF);
        REQUIRE(nearlyEqual(c.r, 1.0f));
        REQUIRE(nearlyEqual(c.g, 0.0f));

        uint32_t hex = c.toHex();
        REQUIRE(hex == 0xFF0000FF);
    }
}
