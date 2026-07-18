#include <catch_amalgamated.hpp>
#include <Math/Matrix4.h>
#include <Math/MathUtils.h>
#include <Math/Vector3.h>
#include <Math/Vector4.h>

using namespace DungeonEngine::Math;

TEST_CASE("Matrix4 Constructors and Basics", "[Math][Matrix4]") {
    SECTION("Default Constructor (Identity)") {
        Matrix4 m;
        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 1), 1.0f));
        REQUIRE(nearlyEqual(m(2, 2), 1.0f));
        REQUIRE(nearlyEqual(m(3, 3), 1.0f));
        REQUIRE(nearlyEqual(m(0, 1), 0.0f));
        REQUIRE(nearlyEqual(m(3, 0), 0.0f));
    }

    SECTION("Column Constructor") {
        Vector4 c0(1, 2, 3, 4);
        Vector4 c1(5, 6, 7, 8);
        Vector4 c2(9, 10, 11, 12);
        Vector4 c3(13, 14, 15, 16);
        Matrix4 m(c0, c1, c2, c3);

        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 0), 2.0f));
        REQUIRE(nearlyEqual(m(0, 1), 5.0f));
        REQUIRE(nearlyEqual(m(3, 3), 16.0f));
    }

    SECTION("16 Floats Constructor") {
        // Remember: constructor takes values in row-major order for readability,
        // but internal storage is column-major.
        Matrix4 m(1, 2, 3, 4,
                  5, 6, 7, 8,
                  9, 10, 11, 12,
                  13, 14, 15, 16);

        // Wait, let's check Matrix4.h constructor for 16 floats.
        // Matrix4(float m00, float m10, float m20, float m30, ...)
        // This takes values in column-major order in the signature (m00, m10, m20, m30 is column 0)
        // Let's verify by just testing some values

        REQUIRE(nearlyEqual(m(0, 0), 1.0f)); // m00
        REQUIRE(nearlyEqual(m(1, 0), 2.0f)); // m10
        REQUIRE(nearlyEqual(m(0, 1), 5.0f)); // m01
        REQUIRE(nearlyEqual(m(3, 3), 16.0f)); // m33
    }

    SECTION("Data Access (operator(), operator[], data())") {
        Matrix4 m(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);

        REQUIRE(nearlyEqual(m(1, 0), 2.0f));
        m(1, 0) = 42.0f;
        REQUIRE(nearlyEqual(m(1, 0), 42.0f));

        REQUIRE(nearlyEqual(m[1].y, 6.0f)); // col 1, y is row 1
        m[1].y = 100.0f;
        REQUIRE(nearlyEqual(m(1, 1), 100.0f));

        const float* d = m.data();
        REQUIRE(nearlyEqual(d[0], 1.0f));
        REQUIRE(nearlyEqual(d[1], 42.0f));
        REQUIRE(nearlyEqual(d[4], 5.0f));
    }

    SECTION("Identity()") {
        Matrix4 m = Matrix4::identity();
        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 1), 1.0f));
        REQUIRE(nearlyEqual(m(2, 2), 1.0f));
        REQUIRE(nearlyEqual(m(3, 3), 1.0f));
        REQUIRE(nearlyEqual(m(0, 1), 0.0f));
        REQUIRE(nearlyEqual(m(3, 0), 0.0f));
    }
}

TEST_CASE("Matrix4 Math Operations", "[Math][Matrix4]") {
    SECTION("Matrix Multiplication") {
        Matrix4 m1(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16
        );
        Matrix4 m2(
            17, 18, 19, 20,
            21, 22, 23, 24,
            25, 26, 27, 28,
            29, 30, 31, 32
        );

        // Matrix multiplication m1 * m2
        // Let's test a couple elements to be sure.
        // Row 0 of m1: (1, 5, 9, 13)
        // Col 0 of m2: (17, 18, 19, 20)
        // Result(0, 0) = 1*17 + 5*18 + 9*19 + 13*20 = 17 + 90 + 171 + 260 = 538

        Matrix4 result = m1 * m2;
        REQUIRE(nearlyEqual(result(0, 0), 538.0f));

        // Let's multiply by identity
        Matrix4 ident = Matrix4::identity();
        Matrix4 idResult = m1 * ident;
        REQUIRE(nearlyEqual(idResult(0, 0), 1.0f));
        REQUIRE(nearlyEqual(idResult(1, 0), 2.0f));
        REQUIRE(nearlyEqual(idResult(3, 3), 16.0f));
    }

    SECTION("Vector Multiplication") {
        Matrix4 m(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16
        );
        Vector4 v(1, 2, 3, 4);

        // Row 0: 1, 5, 9, 13  -> 1*1 + 5*2 + 9*3 + 13*4 = 1 + 10 + 27 + 52 = 90
        // Row 1: 2, 6, 10, 14 -> 2*1 + 6*2 + 10*3 + 14*4 = 2 + 12 + 30 + 56 = 100
        // Row 2: 3, 7, 11, 15 -> 3*1 + 7*2 + 11*3 + 15*4 = 3 + 14 + 33 + 60 = 110
        // Row 3: 4, 8, 12, 16 -> 4*1 + 8*2 + 12*3 + 16*4 = 4 + 16 + 36 + 64 = 120
        Vector4 result = m * v;

        REQUIRE(nearlyEqual(result.x, 90.0f));
        REQUIRE(nearlyEqual(result.y, 100.0f));
        REQUIRE(nearlyEqual(result.z, 110.0f));
        REQUIRE(nearlyEqual(result.w, 120.0f));
    }

    SECTION("Transpose") {
        // m is col0(1,2,3,4), col1(5,6,7,8)...
        // So m(0,0)=1, m(1,0)=2, m(0,1)=5
        Matrix4 m(
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
            13, 14, 15, 16
        );

        Matrix4 t = m.transpose();

        REQUIRE(nearlyEqual(t(0, 0), 1.0f));
        REQUIRE(nearlyEqual(t(1, 0), 5.0f)); // t(1,0) should be m(0,1) = 5
        REQUIRE(nearlyEqual(t(2, 0), 9.0f));
        REQUIRE(nearlyEqual(t(3, 0), 13.0f));

        REQUIRE(nearlyEqual(t(0, 1), 2.0f)); // t(0,1) should be m(1,0) = 2
        REQUIRE(nearlyEqual(t(1, 1), 6.0f));
        REQUIRE(nearlyEqual(t(2, 1), 10.0f));
        REQUIRE(nearlyEqual(t(3, 1), 14.0f));

        REQUIRE(nearlyEqual(t(3, 3), 16.0f));
    }
} // end TEST_CASE

TEST_CASE("Matrix4 Advanced Operations", "[Math][Matrix4]") {
    SECTION("Determinant") {
        Matrix4 m(
            1, 0, 2, -1,
            3, 0, 0, 5,
            2, 1, 4, -3,
            1, 0, 5, 0
        );
        // Let's test a known determinant or identity
        Matrix4 id = Matrix4::identity();
        REQUIRE(nearlyEqual(id.determinant(), 1.0f));

        Matrix4 scale = Matrix4::createScale(Vector3(2.0f, 3.0f, 4.0f));
        REQUIRE(nearlyEqual(scale.determinant(), 24.0f));
    }

    SECTION("Inverse") {
        Matrix4 t = Matrix4::createTranslation(Vector3(1.0f, 2.0f, 3.0f));
        Matrix4 s = Matrix4::createScale(Vector3(2.0f, 2.0f, 2.0f));
        Matrix4 m = t * s;

        Matrix4 inv = m.inverse();
        Matrix4 id = m * inv;

        REQUIRE(nearlyEqual(id(0, 0), 1.0f));
        REQUIRE(nearlyEqual(id(1, 1), 1.0f));
        REQUIRE(nearlyEqual(id(2, 2), 1.0f));
        REQUIRE(nearlyEqual(id(3, 3), 1.0f));
        REQUIRE(nearlyEqual(id(0, 3), 0.0f));
        REQUIRE(nearlyEqual(id(1, 0), 0.0f));
        REQUIRE(nearlyEqual(id(2, 1), 0.0f));

        // Inverse of identity is identity
        Matrix4 ident = Matrix4::identity();
        Matrix4 identInv = ident.inverse();
        REQUIRE(nearlyEqual(identInv(0, 0), 1.0f));
        REQUIRE(nearlyEqual(identInv(3, 3), 1.0f));
        REQUIRE(nearlyEqual(identInv(1, 2), 0.0f));
    }
}

TEST_CASE("Matrix4 Transformations", "[Math][Matrix4]") {
    SECTION("Translation") {
        Matrix4 t = Matrix4::createTranslation(Vector3(1.0f, 2.0f, 3.0f));
        Vector4 p(0.0f, 0.0f, 0.0f, 1.0f); // Point
        Vector4 r = t * p;

        REQUIRE(nearlyEqual(r.x, 1.0f));
        REQUIRE(nearlyEqual(r.y, 2.0f));
        REQUIRE(nearlyEqual(r.z, 3.0f));
        REQUIRE(nearlyEqual(r.w, 1.0f));

        Vector4 d(1.0f, 0.0f, 0.0f, 0.0f); // Direction
        Vector4 r2 = t * d;

        REQUIRE(nearlyEqual(r2.x, 1.0f));
        REQUIRE(nearlyEqual(r2.y, 0.0f));
        REQUIRE(nearlyEqual(r2.z, 0.0f));
        REQUIRE(nearlyEqual(r2.w, 0.0f));
    }

    SECTION("Scale") {
        Matrix4 s = Matrix4::createScale(Vector3(2.0f, 3.0f, 4.0f));
        Vector4 p(1.0f, 1.0f, 1.0f, 1.0f);
        Vector4 r = s * p;

        REQUIRE(nearlyEqual(r.x, 2.0f));
        REQUIRE(nearlyEqual(r.y, 3.0f));
        REQUIRE(nearlyEqual(r.z, 4.0f));
        REQUIRE(nearlyEqual(r.w, 1.0f));
    }

    SECTION("Rotation X") {
        Matrix4 rx = Matrix4::createRotationX(PI / 2.0f); // 90 degrees
        Vector4 p(0.0f, 1.0f, 0.0f, 1.0f);
        Vector4 r = rx * p;

        // (0, 1, 0) rotated 90 deg around X becomes (0, 0, 1)
        REQUIRE(nearlyEqual(r.x, 0.0f));
        REQUIRE(nearlyEqual(r.y, 0.0f));
        REQUIRE(nearlyEqual(r.z, 1.0f));
    }

    SECTION("Rotation Y") {
        Matrix4 ry = Matrix4::createRotationY(PI / 2.0f); // 90 degrees
        Vector4 p(1.0f, 0.0f, 0.0f, 1.0f);
        Vector4 r = ry * p;

        // (1, 0, 0) rotated 90 deg around Y becomes (0, 0, -1) in right-handed
        REQUIRE(nearlyEqual(r.x, 0.0f));
        REQUIRE(nearlyEqual(r.y, 0.0f));
        REQUIRE(nearlyEqual(r.z, -1.0f));
    }

    SECTION("Rotation Z") {
        Matrix4 rz = Matrix4::createRotationZ(PI / 2.0f); // 90 degrees
        Vector4 p(1.0f, 0.0f, 0.0f, 1.0f);
        Vector4 r = rz * p;

        // (1, 0, 0) rotated 90 deg around Z becomes (0, 1, 0)
        REQUIRE(nearlyEqual(r.x, 0.0f));
        REQUIRE(nearlyEqual(r.y, 1.0f));
        REQUIRE(nearlyEqual(r.z, 0.0f));
    }
}

TEST_CASE("Matrix4 Camera and Projections", "[Math][Matrix4]") {
    SECTION("Orthographic") {
        Matrix4 ortho = Matrix4::createOrthographic(-10.0f, 10.0f, -10.0f, 10.0f, 0.1f, 100.0f);

        // Point in center
        Vector4 pCenter(0.0f, 0.0f, -50.0f, 1.0f);
        Vector4 rCenter = ortho * pCenter;
        // z should map to range [-1, 1] linearly (or something similar depending on convention)
        // With createOrthographic mapping to Vulkan or OpenGL conventions

        REQUIRE(nearlyEqual(rCenter.x, 0.0f));
        REQUIRE(nearlyEqual(rCenter.y, 0.0f));

        // Point on right edge
        Vector4 pRight(10.0f, 0.0f, -50.0f, 1.0f);
        Vector4 rRight = ortho * pRight;
        REQUIRE(nearlyEqual(rRight.x, 1.0f));

        // Point on top edge
        Vector4 pTop(0.0f, 10.0f, -50.0f, 1.0f);
        Vector4 rTop = ortho * pTop;
        REQUIRE(nearlyEqual(rTop.y, 1.0f));
    }

    SECTION("Perspective") {
        float fov = PI / 2.0f; // 90 deg
        float aspect = 1.0f; // Square aspect
        float nearClip = 0.1f;
        float farClip = 100.0f;

        Matrix4 persp = Matrix4::createPerspective(fov, aspect, nearClip, farClip);

        // Verify w component gets set for perspective division
        Vector4 p(0.0f, 0.0f, -10.0f, 1.0f);
        Vector4 r = persp * p;

        // The w component of the result should be -z
        REQUIRE(nearlyEqual(r.w, 10.0f));
    }

    SECTION("LookAt") {
        Vector3 eye(0.0f, 0.0f, 0.0f);
        Vector3 center(0.0f, 0.0f, -1.0f);
        Vector3 up(0.0f, 1.0f, 0.0f);

        Matrix4 view = Matrix4::lookAt(eye, center, up);

        // Looking down -Z from origin with Y up is basically the identity matrix
        // (or close to it depending on whether it's looking at +Z or -Z, right handed looks at -Z)
        REQUIRE(nearlyEqual(view(0, 0), 1.0f));
        REQUIRE(nearlyEqual(view(1, 1), 1.0f));
        REQUIRE(nearlyEqual(view(2, 2), 1.0f));
        REQUIRE(nearlyEqual(view(3, 3), 1.0f));
    }
}
