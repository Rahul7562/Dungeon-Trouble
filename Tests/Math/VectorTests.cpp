#include <catch_amalgamated.hpp>
#include <Math/Vector.h>

using namespace DungeonEngine::Math;

TEST_CASE("Vector2 Functionality", "[Math][Vector2]") {
    Vector2 a(1.0f, 2.0f);
    Vector2 b(3.0f, 4.0f);

    SECTION("Arithmetic") {
        Vector2 c = a + b;
        REQUIRE(nearlyEqual(c.x, 4.0f));
        REQUIRE(nearlyEqual(c.y, 6.0f));

        c = b - a;
        REQUIRE(nearlyEqual(c.x, 2.0f));
        REQUIRE(nearlyEqual(c.y, 2.0f));

        c = a * 2.0f;
        REQUIRE(nearlyEqual(c.x, 2.0f));
        REQUIRE(nearlyEqual(c.y, 4.0f));
    }

    SECTION("Length and Dot") {
        REQUIRE(nearlyEqual(a.dot(b), 11.0f)); // 1*3 + 2*4
        REQUIRE(nearlyEqual(a.lengthSquared(), 5.0f));
        REQUIRE(nearlyEqual(a.length(), std::sqrt(5.0f)));
    }

    SECTION("Normalize") {
        Vector2 c = a.normalized();
        REQUIRE(nearlyEqual(c.length(), 1.0f));

        Vector2 z = Vector2::zero();
        Vector2 sz = z.safeNormalized(Vector2::up());
        REQUIRE(sz == Vector2::up());
    }
}

TEST_CASE("Vector3 Functionality", "[Math][Vector3]") {
    Vector3 a(1.0f, 2.0f, 3.0f);
    Vector3 b(4.0f, 5.0f, 6.0f);

    SECTION("Cross Product") {
        Vector3 c = a.cross(b);
        REQUIRE(nearlyEqual(c.x, -3.0f));
        REQUIRE(nearlyEqual(c.y, 6.0f));
        REQUIRE(nearlyEqual(c.z, -3.0f));
    }
}
