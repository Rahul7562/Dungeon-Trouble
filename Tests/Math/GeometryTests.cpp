#include <catch_amalgamated.hpp>
#include <Math/Geometry.h>

using namespace DungeonEngine::Math;

TEST_CASE("Geometry Structs", "[Math][Geometry]") {
    SECTION("Point2D Initialization") {
        Point2D defaultPoint;
        REQUIRE(defaultPoint.position == Vector2(0.0f));

        Point2D p1(Vector2(2.5f, -1.5f));
        REQUIRE(p1.position == Vector2(2.5f, -1.5f));
    }

    SECTION("Line2D Initialization") {
        Line2D l1(Vector2(1.0f, 2.0f), Vector2(3.0f, 4.0f));
        REQUIRE(l1.start == Vector2(1.0f, 2.0f));
        REQUIRE(l1.end == Vector2(3.0f, 4.0f));
    }

    SECTION("Ray2D Initialization") {
        Ray2D r1(Vector2(0.0f, 0.0f), Vector2(1.0f, 0.0f));
        REQUIRE(r1.origin == Vector2(0.0f, 0.0f));
        REQUIRE(r1.direction == Vector2(1.0f, 0.0f));
    }

    SECTION("Rectangle") {
        Rectangle rect(Vector2(5.0f, 5.0f), Vector2(2.0f, 2.0f));
        REQUIRE(rect.min() == Vector2(3.0f, 3.0f));
        REQUIRE(rect.max() == Vector2(7.0f, 7.0f));
    }

    SECTION("AABB") {
        AABB aabb(Vector3(-1.0f, -1.0f, -1.0f), Vector3(1.0f, 1.0f, 1.0f));
        REQUIRE(aabb.center() == Vector3(0.0f, 0.0f, 0.0f));
        REQUIRE(aabb.extents() == Vector3(1.0f, 1.0f, 1.0f));
    }
}
