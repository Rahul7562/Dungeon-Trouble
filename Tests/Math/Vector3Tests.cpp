#include <catch_amalgamated.hpp>
#include <Math/Vector3.h>

using namespace DungeonEngine::Math;

TEST_CASE("Vector3 Construction", "[Math][Vector3]") {
    SECTION("Default Construction") {
        Vector3 v;
        REQUIRE(nearlyEqual(v.x, 0.0f));
        REQUIRE(nearlyEqual(v.y, 0.0f));
        REQUIRE(nearlyEqual(v.z, 0.0f));
    }
    SECTION("Scalar Construction") {
        Vector3 v(2.5f);
        REQUIRE(nearlyEqual(v.x, 2.5f));
        REQUIRE(nearlyEqual(v.y, 2.5f));
        REQUIRE(nearlyEqual(v.z, 2.5f));
    }
    SECTION("Component Construction") {
        Vector3 v(1.0f, 2.0f, 3.0f);
        REQUIRE(nearlyEqual(v.x, 1.0f));
        REQUIRE(nearlyEqual(v.y, 2.0f));
        REQUIRE(nearlyEqual(v.z, 3.0f));
    }
}

TEST_CASE("Vector3 Arithmetic", "[Math][Vector3]") {
    Vector3 a(1.0f, 2.0f, 3.0f);
    Vector3 b(4.0f, 5.0f, 6.0f);

    SECTION("Addition") {
        Vector3 c = a + b;
        REQUIRE(nearlyEqual(c.x, 5.0f));
        REQUIRE(nearlyEqual(c.y, 7.0f));
        REQUIRE(nearlyEqual(c.z, 9.0f));

        Vector3 a_copy = a;
        a_copy += b;
        REQUIRE(a_copy == c);
    }
    SECTION("Subtraction") {
        Vector3 c = b - a;
        REQUIRE(nearlyEqual(c.x, 3.0f));
        REQUIRE(nearlyEqual(c.y, 3.0f));
        REQUIRE(nearlyEqual(c.z, 3.0f));

        Vector3 b_copy = b;
        b_copy -= a;
        REQUIRE(b_copy == c);
    }
    SECTION("Multiplication") {
        Vector3 c = a * b;
        REQUIRE(nearlyEqual(c.x, 4.0f));
        REQUIRE(nearlyEqual(c.y, 10.0f));
        REQUIRE(nearlyEqual(c.z, 18.0f));

        Vector3 a_copy = a;
        a_copy *= b;
        REQUIRE(a_copy == c);
    }
    SECTION("Division") {
        Vector3 c = b / a;
        REQUIRE(nearlyEqual(c.x, 4.0f));
        REQUIRE(nearlyEqual(c.y, 2.5f));
        REQUIRE(nearlyEqual(c.z, 2.0f));

        Vector3 b_copy = b;
        b_copy /= a;
        REQUIRE(b_copy == c);
    }
    SECTION("Scalar Multiplication") {
        Vector3 c1 = a * 2.0f;
        Vector3 c2 = 2.0f * a;
        REQUIRE(c1 == c2);
        REQUIRE(nearlyEqual(c1.x, 2.0f));
        REQUIRE(nearlyEqual(c1.y, 4.0f));
        REQUIRE(nearlyEqual(c1.z, 6.0f));

        Vector3 a_copy = a;
        a_copy *= 2.0f;
        REQUIRE(a_copy == c1);
    }
    SECTION("Scalar Division") {
        Vector3 c = a / 2.0f;
        REQUIRE(nearlyEqual(c.x, 0.5f));
        REQUIRE(nearlyEqual(c.y, 1.0f));
        REQUIRE(nearlyEqual(c.z, 1.5f));

        Vector3 a_copy = a;
        a_copy /= 2.0f;
        REQUIRE(a_copy == c);
    }
    SECTION("Unary Minus") {
        Vector3 c = -a;
        REQUIRE(nearlyEqual(c.x, -1.0f));
        REQUIRE(nearlyEqual(c.y, -2.0f));
        REQUIRE(nearlyEqual(c.z, -3.0f));
    }
}

TEST_CASE("Vector3 Comparison", "[Math][Vector3]") {
    Vector3 a(1.0f, 2.0f, 3.0f);
    Vector3 b(1.0f, 2.0f, 3.0f);
    Vector3 c(1.1f, 2.0f, 3.0f);

    REQUIRE(a == b);
    REQUIRE(a != c);
}

TEST_CASE("Vector3 Operations", "[Math][Vector3]") {
    Vector3 a(1.0f, 2.0f, 2.0f); // length is 3
    Vector3 b(4.0f, 0.0f, 3.0f); // length is 5

    SECTION("Dot Product") {
        REQUIRE(nearlyEqual(a.dot(b), 10.0f)); // 1*4 + 2*0 + 2*3
    }
    SECTION("Cross Product") {
        Vector3 i(1.0f, 0.0f, 0.0f);
        Vector3 j(0.0f, 1.0f, 0.0f);
        Vector3 k = i.cross(j);
        REQUIRE(nearlyEqual(k.x, 0.0f));
        REQUIRE(nearlyEqual(k.y, 0.0f));
        REQUIRE(nearlyEqual(k.z, 1.0f));
    }
    SECTION("Length and Distance") {
        REQUIRE(nearlyEqual(a.lengthSquared(), 9.0f));
        REQUIRE(nearlyEqual(a.length(), 3.0f));
        REQUIRE(nearlyEqual(b.lengthSquared(), 25.0f));
        REQUIRE(nearlyEqual(b.length(), 5.0f));

        float distSq = a.distanceSquared(b); // (1-4)^2 + (2-0)^2 + (2-3)^2 = 9 + 4 + 1 = 14
        REQUIRE(nearlyEqual(distSq, 14.0f));
        REQUIRE(nearlyEqual(a.distance(b), std::sqrt(14.0f)));
    }
    SECTION("Normalization") {
        Vector3 c = a.normalized();
        REQUIRE(nearlyEqual(c.length(), 1.0f));
        REQUIRE(nearlyEqual(c.x, 1.0f/3.0f));
        REQUIRE(nearlyEqual(c.y, 2.0f/3.0f));
        REQUIRE(nearlyEqual(c.z, 2.0f/3.0f));

        Vector3 a_copy = a;
        a_copy.normalize();
        REQUIRE(a_copy == c);
    }
    SECTION("Safe Normalization") {
        Vector3 z = Vector3::zero();
        Vector3 fallback = Vector3::up();
        Vector3 c = z.safeNormalized(fallback);
        REQUIRE(c == fallback);

        Vector3 z_copy = z;
        z_copy.safeNormalize(fallback);
        REQUIRE(z_copy == fallback);
    }
    SECTION("Reflect") {
        Vector3 v(1.0f, -1.0f, 0.0f);
        Vector3 normal(0.0f, 1.0f, 0.0f);
        Vector3 r = v.reflect(normal);
        REQUIRE(nearlyEqual(r.x, 1.0f));
        REQUIRE(nearlyEqual(r.y, 1.0f));
        REQUIRE(nearlyEqual(r.z, 0.0f));
    }
    SECTION("Project") {
        Vector3 v(1.0f, 1.0f, 0.0f);
        Vector3 on(1.0f, 0.0f, 0.0f);
        Vector3 p = v.project(on);
        REQUIRE(nearlyEqual(p.x, 1.0f));
        REQUIRE(nearlyEqual(p.y, 0.0f));
        REQUIRE(nearlyEqual(p.z, 0.0f));
    }
    SECTION("Angle To") {
        Vector3 v1(1.0f, 0.0f, 0.0f);
        Vector3 v2(0.0f, 1.0f, 0.0f);
        REQUIRE(nearlyEqual(v1.angleTo(v2), M_PI / 2.0f)); // 90 degrees
    }
}

TEST_CASE("Vector3 Constants", "[Math][Vector3]") {
    REQUIRE(Vector3::zero() == Vector3(0.0f, 0.0f, 0.0f));
    REQUIRE(Vector3::one() == Vector3(1.0f, 1.0f, 1.0f));
    REQUIRE(Vector3::up() == Vector3(0.0f, 1.0f, 0.0f));
    REQUIRE(Vector3::down() == Vector3(0.0f, -1.0f, 0.0f));
    REQUIRE(Vector3::left() == Vector3(-1.0f, 0.0f, 0.0f));
    REQUIRE(Vector3::right() == Vector3(1.0f, 0.0f, 0.0f));
    REQUIRE(Vector3::forward() == Vector3(0.0f, 0.0f, -1.0f));
    REQUIRE(Vector3::back() == Vector3(0.0f, 0.0f, 1.0f));
}
