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

    SECTION("Vector2 Generation") {
        Random rng(42);
        for(int i=0; i<100; i++) {
            Vector2 inCircle = rng.getVector2InCircle();
            REQUIRE(inCircle.lengthSquared() <= 1.0f + EPSILON);

            Vector2 unitVec = rng.getUnitVector2();
            REQUIRE(nearlyEqual(unitVec.lengthSquared(), 1.0f));
        }
    }
}
