#include <catch_amalgamated.hpp>
#include <Math/Collision.h>

using namespace DungeonEngine::Math;

TEST_CASE("Collision Intersections", "[Math][Collision]") {
    SECTION("Point vs Rectangle") {
        Rectangle r(Vector2(0.0f, 0.0f), Vector2(5.0f, 5.0f)); // min -5,-5, max 5,5
        Point2D p1(Vector2(1.0f, 1.0f));
        Point2D p2(Vector2(10.0f, 10.0f));

        REQUIRE(Collision::intersect(p1, r) == true);
        REQUIRE(Collision::intersect(p2, r) == false);
    }

    SECTION("Ray vs AABB") {
        AABB box(Vector3(-1.0f, -1.0f, -1.0f), Vector3(1.0f, 1.0f, 1.0f));
        Ray3D ray(Vector3(0.0f, 0.0f, -5.0f), Vector3(0.0f, 0.0f, 1.0f));

        float dist;
        bool hit = Collision::intersect(ray, box, dist);
        REQUIRE(hit == true);
        REQUIRE(nearlyEqual(dist, 4.0f));
    }
}
