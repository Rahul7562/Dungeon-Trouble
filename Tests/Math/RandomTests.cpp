#include <catch_amalgamated.hpp>
#include <Math/Random.h>

using namespace DungeonEngine::Math;

TEST_CASE("Random Generator Functionality", "[Math][Random]") {
    SECTION("Determinism") {
        Random r1(12345);
        Random r2(12345);

        REQUIRE(r1.next() == r2.next());
        REQUIRE(nearlyEqual(r1.getFloat(), r2.getFloat()));
    }

    SECTION("Ranges") {
        Random rng(1337);
        for(int i=0; i<100; i++) {
            float f = rng.getFloat(5.0f, 10.0f);
            REQUIRE((f >= 5.0f && f <= 10.0f));

            int integer = rng.getInt(-5, 5);
            REQUIRE((integer >= -5 && integer <= 5));
        }
    }

    SECTION("getColor") {
        Random rng(42);
        Color c1 = rng.getColor();
        Color c2 = rng.getColor();

        // Check ranges
        REQUIRE((c1.r >= 0.0f && c1.r <= 1.0f));
        REQUIRE((c1.g >= 0.0f && c1.g <= 1.0f));
        REQUIRE((c1.b >= 0.0f && c1.b <= 1.0f));
        REQUIRE(c1.a == 1.0f);

        // Check that sequential calls produce different colors (extremely unlikely to be identical)
        bool isDifferent = (c1.r != c2.r) || (c1.g != c2.g) || (c1.b != c2.b);
        REQUIRE(isDifferent);
    }
}
