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

    SECTION("Static predefined colors") {
        Color clear = Color::clear();
        REQUIRE(nearlyEqual(clear.r, 0.0f));
        REQUIRE(nearlyEqual(clear.g, 0.0f));
        REQUIRE(nearlyEqual(clear.b, 0.0f));
        REQUIRE(nearlyEqual(clear.a, 0.0f));

        Color white = Color::white();
        REQUIRE(nearlyEqual(white.r, 1.0f));
        REQUIRE(nearlyEqual(white.g, 1.0f));
        REQUIRE(nearlyEqual(white.b, 1.0f));
        REQUIRE(nearlyEqual(white.a, 1.0f));

        Color black = Color::black();
        REQUIRE(nearlyEqual(black.r, 0.0f));
        REQUIRE(nearlyEqual(black.g, 0.0f));
        REQUIRE(nearlyEqual(black.b, 0.0f));
        REQUIRE(nearlyEqual(black.a, 1.0f));

        Color red = Color::red();
        REQUIRE(nearlyEqual(red.r, 1.0f));
        REQUIRE(nearlyEqual(red.g, 0.0f));
        REQUIRE(nearlyEqual(red.b, 0.0f));
        REQUIRE(nearlyEqual(red.a, 1.0f));

        Color green = Color::green();
        REQUIRE(nearlyEqual(green.r, 0.0f));
        REQUIRE(nearlyEqual(green.g, 1.0f));
        REQUIRE(nearlyEqual(green.b, 0.0f));
        REQUIRE(nearlyEqual(green.a, 1.0f));

        Color blue = Color::blue();
        REQUIRE(nearlyEqual(blue.r, 0.0f));
        REQUIRE(nearlyEqual(blue.g, 0.0f));
        REQUIRE(nearlyEqual(blue.b, 1.0f));
        REQUIRE(nearlyEqual(blue.a, 1.0f));
    }
}
