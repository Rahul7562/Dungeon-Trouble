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

    SECTION("Predefined Colors") {
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

        Color clear = Color::clear();
        REQUIRE(nearlyEqual(clear.r, 0.0f));
        REQUIRE(nearlyEqual(clear.g, 0.0f));
        REQUIRE(nearlyEqual(clear.b, 0.0f));
        REQUIRE(nearlyEqual(clear.a, 0.0f));
    }

    SECTION("Arithmetic Operators") {
        Color c1(0.5f, 0.2f, 0.1f, 1.0f);
        Color c2(0.2f, 0.5f, 0.8f, 0.5f);

        Color c3 = c1 + c2;
        REQUIRE(nearlyEqual(c3.r, 0.7f));
        REQUIRE(nearlyEqual(c3.g, 0.7f));
        REQUIRE(nearlyEqual(c3.b, 0.9f));
        REQUIRE(nearlyEqual(c3.a, 1.5f));

        Color c4 = c1 * c2;
        REQUIRE(nearlyEqual(c4.r, 0.1f));
        REQUIRE(nearlyEqual(c4.g, 0.1f));
        REQUIRE(nearlyEqual(c4.b, 0.08f));
        REQUIRE(nearlyEqual(c4.a, 0.5f));

        Color c5 = c1 * 2.0f;
        REQUIRE(nearlyEqual(c5.r, 1.0f));
        REQUIRE(nearlyEqual(c5.g, 0.4f));
        REQUIRE(nearlyEqual(c5.b, 0.2f));
        REQUIRE(nearlyEqual(c5.a, 2.0f));
    }
}
