#include <catch_amalgamated.hpp>
#include <Math/Noise.h>

using namespace DungeonEngine::Math;

TEST_CASE("Noise Functionality", "[Math][Noise]") {
    SECTION("ValueNoise Output Bounds") {
        ValueNoise noise(42);
        for(float x = 0.0f; x < 10.0f; x += 0.5f) {
            float val = noise.get(x, 5.0f);
            REQUIRE((val >= 0.0f && val <= 1.0f));
        }
    }

    SECTION("PerlinNoise Determinism") {
        PerlinNoise p1(123);
        PerlinNoise p2(123);

        REQUIRE(nearlyEqual(p1.get(1.5f, 2.5f), p2.get(1.5f, 2.5f)));
    }
}
