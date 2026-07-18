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

    SECTION("HSV Conversion") {
        // Zero Saturation (grayscale)
        Color gray = Color::fromHSV(150.0f, 0.0f, 0.5f);
        REQUIRE(nearlyEqual(gray.r, 0.5f));
        REQUIRE(nearlyEqual(gray.g, 0.5f));
        REQUIRE(nearlyEqual(gray.b, 0.5f));
        REQUIRE(nearlyEqual(gray.a, 1.0f));

        // Primary colors
        Color red = Color::fromHSV(0.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(red.r, 1.0f));
        REQUIRE(nearlyEqual(red.g, 0.0f));
        REQUIRE(nearlyEqual(red.b, 0.0f));

        Color green = Color::fromHSV(120.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(green.r, 0.0f));
        REQUIRE(nearlyEqual(green.g, 1.0f));
        REQUIRE(nearlyEqual(green.b, 0.0f));

        Color blue = Color::fromHSV(240.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(blue.r, 0.0f));
        REQUIRE(nearlyEqual(blue.g, 0.0f));
        REQUIRE(nearlyEqual(blue.b, 1.0f));

        // Mixed colors
        Color yellow = Color::fromHSV(60.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(yellow.r, 1.0f));
        REQUIRE(nearlyEqual(yellow.g, 1.0f));
        REQUIRE(nearlyEqual(yellow.b, 0.0f));

        Color cyan = Color::fromHSV(180.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(cyan.r, 0.0f));
        REQUIRE(nearlyEqual(cyan.g, 1.0f));
        REQUIRE(nearlyEqual(cyan.b, 1.0f));

        Color magenta = Color::fromHSV(300.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(magenta.r, 1.0f));
        REQUIRE(nearlyEqual(magenta.g, 0.0f));
        REQUIRE(nearlyEqual(magenta.b, 1.0f));

        // Hue Wrapping
        Color wrappedRed = Color::fromHSV(360.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(wrappedRed.r, 1.0f));
        REQUIRE(nearlyEqual(wrappedRed.g, 0.0f));
        REQUIRE(nearlyEqual(wrappedRed.b, 0.0f));

        Color negWrappedRed = Color::fromHSV(-360.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(negWrappedRed.r, 1.0f));
        REQUIRE(nearlyEqual(negWrappedRed.g, 0.0f));
        REQUIRE(nearlyEqual(negWrappedRed.b, 0.0f));

        Color overWrappedGreen = Color::fromHSV(480.0f, 1.0f, 1.0f);
        REQUIRE(nearlyEqual(overWrappedGreen.r, 0.0f));
        REQUIRE(nearlyEqual(overWrappedGreen.g, 1.0f));
        REQUIRE(nearlyEqual(overWrappedGreen.b, 0.0f));
    }
}
