#include <catch_amalgamated.hpp>
#include <Math/Matrix3.h>
#include <Math/Vector3.h>
#include <Math/MathUtils.h>

using namespace DungeonEngine::Math;

TEST_CASE("Matrix3 Constructors and Initialization", "[Math][Matrix3]") {
    SECTION("Default constructor creates identity matrix") {
        Matrix3 m;
        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 0), 0.0f));
        REQUIRE(nearlyEqual(m(2, 0), 0.0f));

        REQUIRE(nearlyEqual(m(0, 1), 0.0f));
        REQUIRE(nearlyEqual(m(1, 1), 1.0f));
        REQUIRE(nearlyEqual(m(2, 1), 0.0f));

        REQUIRE(nearlyEqual(m(0, 2), 0.0f));
        REQUIRE(nearlyEqual(m(1, 2), 0.0f));
        REQUIRE(nearlyEqual(m(2, 2), 1.0f));
    }

    SECTION("Vector3 columns constructor") {
        Vector3 c0(1.0f, 2.0f, 3.0f);
        Vector3 c1(4.0f, 5.0f, 6.0f);
        Vector3 c2(7.0f, 8.0f, 9.0f);
        Matrix3 m(c0, c1, c2);

        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 0), 2.0f));
        REQUIRE(nearlyEqual(m(2, 0), 3.0f));

        REQUIRE(nearlyEqual(m(0, 1), 4.0f));
        REQUIRE(nearlyEqual(m(1, 1), 5.0f));
        REQUIRE(nearlyEqual(m(2, 1), 6.0f));

        REQUIRE(nearlyEqual(m(0, 2), 7.0f));
        REQUIRE(nearlyEqual(m(1, 2), 8.0f));
        REQUIRE(nearlyEqual(m(2, 2), 9.0f));
    }

    SECTION("Float elements constructor") {
        Matrix3 m(1.0f, 2.0f, 3.0f,
                  4.0f, 5.0f, 6.0f,
                  7.0f, 8.0f, 9.0f);

        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(1, 0), 2.0f));
        REQUIRE(nearlyEqual(m(2, 0), 3.0f));

        REQUIRE(nearlyEqual(m(0, 1), 4.0f));
        REQUIRE(nearlyEqual(m(1, 1), 5.0f));
        REQUIRE(nearlyEqual(m(2, 1), 6.0f));

        REQUIRE(nearlyEqual(m(0, 2), 7.0f));
        REQUIRE(nearlyEqual(m(1, 2), 8.0f));
        REQUIRE(nearlyEqual(m(2, 2), 9.0f));
    }
}

TEST_CASE("Matrix3 Data Access", "[Math][Matrix3]") {
    Matrix3 m(1.0f, 2.0f, 3.0f,
              4.0f, 5.0f, 6.0f,
              7.0f, 8.0f, 9.0f);

    SECTION("operator()") {
        REQUIRE(nearlyEqual(m(0, 0), 1.0f));
        REQUIRE(nearlyEqual(m(2, 1), 6.0f));
        m(2, 1) = 10.0f;
        REQUIRE(nearlyEqual(m(2, 1), 10.0f));
    }

    SECTION("operator[]") {
        REQUIRE(nearlyEqual(m[0].x, 1.0f));
        REQUIRE(nearlyEqual(m[0].y, 2.0f));
        REQUIRE(nearlyEqual(m[0].z, 3.0f));

        m[1].y = 20.0f;
        REQUIRE(nearlyEqual(m(1, 1), 20.0f));
    }

    SECTION("data() pointer access") {
        const float* d = m.data();
        REQUIRE(nearlyEqual(d[0], 1.0f)); // col 0, row 0
        REQUIRE(nearlyEqual(d[1], 2.0f)); // col 0, row 1
        REQUIRE(nearlyEqual(d[2], 3.0f)); // col 0, row 2
        REQUIRE(nearlyEqual(d[3], 4.0f)); // col 1, row 0

        float* mut_d = m.data();
        mut_d[0] = 100.0f;
        REQUIRE(nearlyEqual(m(0, 0), 100.0f));
    }
}

TEST_CASE("Matrix3 Mathematical Operations", "[Math][Matrix3]") {
    SECTION("Matrix multiplication") {
        Matrix3 a(1.0f, 2.0f, 3.0f,
                  4.0f, 5.0f, 6.0f,
                  7.0f, 8.0f, 9.0f);
        Matrix3 b(9.0f, 8.0f, 7.0f,
                  6.0f, 5.0f, 4.0f,
                  3.0f, 2.0f, 1.0f);

        Matrix3 r = a * b;

        // Col 0
        REQUIRE(nearlyEqual(r(0, 0), 1.0f*9.0f + 4.0f*8.0f + 7.0f*7.0f));
        REQUIRE(nearlyEqual(r(1, 0), 2.0f*9.0f + 5.0f*8.0f + 8.0f*7.0f));
        REQUIRE(nearlyEqual(r(2, 0), 3.0f*9.0f + 6.0f*8.0f + 9.0f*7.0f));

        // Identity multiplication
        Matrix3 id = Matrix3::identity();
        Matrix3 r2 = a * id;
        REQUIRE(nearlyEqual(r2(0,0), a(0,0)));
        REQUIRE(nearlyEqual(r2(2,2), a(2,2)));
    }

    SECTION("Vector multiplication") {
        Matrix3 a(1.0f, 2.0f, 3.0f,
                  4.0f, 5.0f, 6.0f,
                  7.0f, 8.0f, 9.0f);
        Vector3 v(2.0f, 3.0f, 4.0f);

        Vector3 r = a * v;
        REQUIRE(nearlyEqual(r.x, 1.0f*2.0f + 4.0f*3.0f + 7.0f*4.0f));
        REQUIRE(nearlyEqual(r.y, 2.0f*2.0f + 5.0f*3.0f + 8.0f*4.0f));
        REQUIRE(nearlyEqual(r.z, 3.0f*2.0f + 6.0f*3.0f + 9.0f*4.0f));
    }
}

TEST_CASE("Matrix3 Matrix Operations", "[Math][Matrix3]") {
    SECTION("Transpose") {
        Matrix3 m(1.0f, 2.0f, 3.0f,
                  4.0f, 5.0f, 6.0f,
                  7.0f, 8.0f, 9.0f);
        Matrix3 t = m.transpose();

        REQUIRE(nearlyEqual(t(0, 0), 1.0f));
        REQUIRE(nearlyEqual(t(0, 1), 2.0f));
        REQUIRE(nearlyEqual(t(0, 2), 3.0f));

        REQUIRE(nearlyEqual(t(1, 0), 4.0f));
        REQUIRE(nearlyEqual(t(1, 1), 5.0f));
        REQUIRE(nearlyEqual(t(1, 2), 6.0f));

        REQUIRE(nearlyEqual(t(2, 0), 7.0f));
        REQUIRE(nearlyEqual(t(2, 1), 8.0f));
        REQUIRE(nearlyEqual(t(2, 2), 9.0f));
    }

    SECTION("Determinant") {
        Matrix3 id = Matrix3::identity();
        REQUIRE(nearlyEqual(id.determinant(), 1.0f));

        Matrix3 m(2.0f, 0.0f, 0.0f,
                  0.0f, 3.0f, 0.0f,
                  0.0f, 0.0f, 4.0f);
        REQUIRE(nearlyEqual(m.determinant(), 24.0f));

        Matrix3 m2( 1.0f, -2.0f, 3.0f,
                    2.0f,  0.0f, 3.0f,
                    1.0f,  5.0f, 4.0f);
        // det = 1*(0*4 - 3*5) - 2*(-2*4 - 3*5) + 1*(-2*3 - 0*3)
        //     = 1*(-15) - 2*(-8 - 15) + 1*(-6)
        //     = -15 - 2*(-23) - 6
        //     = -15 + 46 - 6 = 25
        REQUIRE(nearlyEqual(m2.determinant(), 25.0f));
    }

    SECTION("Inverse") {
        Matrix3 id = Matrix3::identity();
        Matrix3 invId = id.inverse();
        REQUIRE(nearlyEqual(invId(0,0), 1.0f));

        Matrix3 m( 1.0f, -2.0f, 3.0f,
                   2.0f,  0.0f, 3.0f,
                   1.0f,  5.0f, 4.0f);

        Matrix3 inv = m.inverse();
        Matrix3 res = m * inv;

        REQUIRE(nearlyEqual(res(0, 0), 1.0f));
        REQUIRE(nearlyEqual(res(1, 1), 1.0f));
        REQUIRE(nearlyEqual(res(2, 2), 1.0f));
        REQUIRE(nearlyEqual(res(0, 1), 0.0f));
        REQUIRE(nearlyEqual(res(1, 0), 0.0f));
        REQUIRE(nearlyEqual(res(0, 2), 0.0f));

        // Zero determinant fallback (should return identity)
        Matrix3 m_zero(0.0f, 0.0f, 0.0f,
                       0.0f, 0.0f, 0.0f,
                       0.0f, 0.0f, 0.0f);
        Matrix3 inv_zero = m_zero.inverse();
        REQUIRE(nearlyEqual(inv_zero(0,0), 1.0f));
    }
}

TEST_CASE("Matrix3 Factory Methods", "[Math][Matrix3]") {
    SECTION("createRotationZ") {
        float angle = PI_2; // 90 degrees
        Matrix3 m = Matrix3::createRotationZ(angle);

        Vector3 v(1.0f, 0.0f, 0.0f);
        Vector3 r = m * v;

        REQUIRE(nearlyEqual(r.x, 0.0f));
        REQUIRE(nearlyEqual(r.y, 1.0f));
        REQUIRE(nearlyEqual(r.z, 0.0f));
    }

    SECTION("createScale") {
        Matrix3 m = Matrix3::createScale(2.0f, 3.0f);

        REQUIRE(nearlyEqual(m(0,0), 2.0f));
        REQUIRE(nearlyEqual(m(1,1), 3.0f));
        REQUIRE(nearlyEqual(m(2,2), 1.0f));

        Vector3 v(1.0f, 1.0f, 1.0f);
        Vector3 r = m * v;
        REQUIRE(nearlyEqual(r.x, 2.0f));
        REQUIRE(nearlyEqual(r.y, 3.0f));
        REQUIRE(nearlyEqual(r.z, 1.0f));
    }

    SECTION("createTranslation") {
        Matrix3 m = Matrix3::createTranslation(5.0f, -2.0f);

        REQUIRE(nearlyEqual(m(0,2), 5.0f));
        REQUIRE(nearlyEqual(m(1,2), -2.0f));

        Vector3 v(0.0f, 0.0f, 1.0f); // Point w=1
        Vector3 r = m * v;

        REQUIRE(nearlyEqual(r.x, 5.0f));
        REQUIRE(nearlyEqual(r.y, -2.0f));
        REQUIRE(nearlyEqual(r.z, 1.0f));

        Vector3 dir(1.0f, 0.0f, 0.0f); // Direction w=0
        Vector3 r2 = m * dir;
        REQUIRE(nearlyEqual(r2.x, 1.0f));
        REQUIRE(nearlyEqual(r2.y, 0.0f));
        REQUIRE(nearlyEqual(r2.z, 0.0f));
    }
}
