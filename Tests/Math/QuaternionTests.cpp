#include <catch_amalgamated.hpp>
#include <Math/Quaternion.h>

using namespace DungeonEngine::Math;

TEST_CASE("Quaternion Functionality", "[Math][Quaternion]") {
    SECTION("Identity") {
        Quaternion q = Quaternion::identity();
        REQUIRE(nearlyEqual(q.x, 0.0f));
        REQUIRE(nearlyEqual(q.y, 0.0f));
        REQUIRE(nearlyEqual(q.z, 0.0f));
        REQUIRE(nearlyEqual(q.w, 1.0f));
    }

    SECTION("Rotate Vector") {
        Quaternion q = Quaternion::createFromAxisAngle(Vector3::up(), PI_2); // Rotate 90 deg around Y
        Vector3 v = Vector3::forward(); // (0, 0, -1)
        Vector3 r = q.rotateVector(v);

        // Forward rotated 90 around Y -> Left ( -1, 0, 0 )
        REQUIRE(nearlyEqual(r.x, -1.0f));
        REQUIRE(nearlyEqual(r.y, 0.0f));
        // There can be slight precision errors
        REQUIRE(std::abs(r.z) < EPSILON * 10);
    }
}
