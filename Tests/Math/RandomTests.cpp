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

    SECTION("Boolean") {
        Random rng(9999);
        int trues = 0;
        int falses = 0;
        for (int i = 0; i < 1000; i++) {
            if (rng.getBool()) {
                trues++;
            } else {
                falses++;
            }
        }
        REQUIRE(trues > 0);
        REQUIRE(falses > 0);
        REQUIRE(trues > 400);
        REQUIRE(trues < 600);
    }
}
