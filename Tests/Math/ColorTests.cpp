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
    }

    SECTION("Hex Conversion") {
        Color c = Color::fromHex(0xFF0000FF);
        REQUIRE(nearlyEqual(c.r, 1.0f));
        REQUIRE(nearlyEqual(c.g, 0.0f));

        uint32_t hex = c.toHex();
        REQUIRE(hex == 0xFF0000FF);
    }

    SECTION("RGB8 Conversion") {
        // Typical values
        Color c1 = Color::fromRGB8(255, 128, 64, 255);
        REQUIRE(nearlyEqual(c1.r, 1.0f));
        REQUIRE(nearlyEqual(c1.g, 128.0f / 255.0f));
        REQUIRE(nearlyEqual(c1.b, 64.0f / 255.0f));
        REQUIRE(nearlyEqual(c1.a, 1.0f));

        // All zeros
        Color c2 = Color::fromRGB8(0, 0, 0, 0);
        REQUIRE(nearlyEqual(c2.r, 0.0f));
        REQUIRE(nearlyEqual(c2.g, 0.0f));
        REQUIRE(nearlyEqual(c2.b, 0.0f));
        REQUIRE(nearlyEqual(c2.a, 0.0f));

        // Default alpha
        Color c3 = Color::fromRGB8(255, 255, 255);
        REQUIRE(nearlyEqual(c3.r, 1.0f));
        REQUIRE(nearlyEqual(c3.a, 1.0f));
    }
}
