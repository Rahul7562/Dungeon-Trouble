#include <catch_amalgamated.hpp>
#include <Math/Transform.h>

using namespace DungeonEngine::Math;

TEST_CASE("Transform3D Functionality", "[Math][Transform3D]") {
    Transform3D parent(Vector3(1.0f, 0.0f, 0.0f), Quaternion::identity(), Vector3(2.0f, 2.0f, 2.0f));
    Transform3D child(Vector3(1.0f, 0.0f, 0.0f), Quaternion::identity(), Vector3(1.0f, 1.0f, 1.0f));

    Transform3D combined = parent * child;
    REQUIRE(nearlyEqual(combined.position.x, 3.0f)); // 1.0 (parent) + 1.0 * 2.0 (child scaled)
}
