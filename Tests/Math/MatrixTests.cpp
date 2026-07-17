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

TEST_CASE("Matrix4 Functionality", "[Math][Matrix4]") {
    SECTION("Translation and Vector Mult") {
        Matrix4 t = Matrix4::createTranslation(Vector3(1.0f, 2.0f, 3.0f));
        Vector4 v(0.0f, 0.0f, 0.0f, 1.0f); // Point
        Vector4 r = t * v;
        REQUIRE(nearlyEqual(r.x, 1.0f));
        REQUIRE(nearlyEqual(r.y, 2.0f));
        REQUIRE(nearlyEqual(r.z, 3.0f));
        REQUIRE(nearlyEqual(r.w, 1.0f));

        Vector4 d(1.0f, 0.0f, 0.0f, 0.0f); // Direction (w=0)
        r = t * d;
        REQUIRE(nearlyEqual(r.x, 1.0f));
        REQUIRE(nearlyEqual(r.y, 0.0f));
        REQUIRE(nearlyEqual(r.z, 0.0f));
        REQUIRE(nearlyEqual(r.w, 0.0f));
    }

    SECTION("Inverse") {
        Matrix4 t = Matrix4::createTranslation(Vector3(1.0f, 2.0f, 3.0f));
        Matrix4 s = Matrix4::createScale(Vector3(2.0f, 2.0f, 2.0f));
        Matrix4 m = t * s;

        Matrix4 inv = m.inverse();
        Matrix4 id = m * inv;

        REQUIRE(nearlyEqual(id(0,0), 1.0f));
        REQUIRE(nearlyEqual(id(1,1), 1.0f));
        REQUIRE(nearlyEqual(id(2,2), 1.0f));
        REQUIRE(nearlyEqual(id(3,3), 1.0f));
        REQUIRE(nearlyEqual(id(0,3), 0.0f));
    }
}
