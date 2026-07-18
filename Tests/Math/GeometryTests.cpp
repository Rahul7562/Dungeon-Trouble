#include <catch_amalgamated.hpp>
#include <Math/Geometry.h>

using namespace DungeonEngine::Math;

TEST_CASE("Geometry Structs", "[Math][Geometry]") {
    Rectangle rect(Vector2(5.0f, 5.0f), Vector2(2.0f, 2.0f));
    REQUIRE(rect.min() == Vector2(3.0f, 3.0f));
    REQUIRE(rect.max() == Vector2(7.0f, 7.0f));

    AABB aabb(Vector3(-1.0f, -1.0f, -1.0f), Vector3(1.0f, 1.0f, 1.0f));
    REQUIRE(aabb.center() == Vector3(0.0f, 0.0f, 0.0f));
    REQUIRE(aabb.extents() == Vector3(1.0f, 1.0f, 1.0f));
}

TEST_CASE("Circle Struct", "[Math][Geometry]") {
    SECTION("Default Constructor") {
        Circle circle;
        REQUIRE(circle.center == Vector2(0.0f, 0.0f));
        REQUIRE(circle.radius == 0.0f);
    }

    SECTION("Parameterized Constructor") {
        Circle circle(Vector2(5.0f, -3.0f), 10.5f);
        REQUIRE(circle.center == Vector2(5.0f, -3.0f));
        REQUIRE(circle.radius == 10.5f);
    }
}
