#include <catch_amalgamated.hpp>
#include <Math/Matrix.h>
#include <Math/Vector3.h>

using namespace DungeonEngine::Math;

TEST_CASE("Matrix3 Functionality", "[Math][Matrix3]") {
    Matrix3 a = Matrix3::identity();
    REQUIRE(nearlyEqual(a(0, 0), 1.0f));
    REQUIRE(nearlyEqual(a(1, 0), 0.0f));

    SECTION("Multiplication") {
        Matrix3 s = Matrix3::createScale(2.0f, 3.0f);
        Vector3 v(1.0f, 1.0f, 0.0f);
        Vector3 r = s * v;
        REQUIRE(nearlyEqual(r.x, 2.0f));
        REQUIRE(nearlyEqual(r.y, 3.0f));
    }
}

