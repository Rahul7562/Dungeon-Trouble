#pragma once

#include "Vector2.h"
#include "Vector3.h"

namespace DungeonEngine::Math {

// 2D Shapes

struct Point2D {
    Vector2 position;
    constexpr Point2D() noexcept : position(0.0f) {}
    constexpr Point2D(const Vector2& pos) noexcept : position(pos) {}
};

struct Line2D {
    Vector2 start;
    Vector2 end;
    constexpr Line2D() noexcept {}
    constexpr Line2D(const Vector2& s, const Vector2& e) noexcept : start(s), end(e) {}
};

struct Ray2D {
    Vector2 origin;
    Vector2 direction;
    constexpr Ray2D() noexcept {}
    constexpr Ray2D(const Vector2& o, const Vector2& d) noexcept : origin(o), direction(d) {}
};

struct Rectangle {
    Vector2 position; // Center position
    Vector2 extents;  // Half-width, Half-height
    constexpr Rectangle() noexcept {}
    constexpr Rectangle(const Vector2& p, const Vector2& e) noexcept : position(p), extents(e) {}

    constexpr Vector2 min() const noexcept { return position - extents; }
    constexpr Vector2 max() const noexcept { return position + extents; }
};

struct Circle {
    Vector2 center;
    float radius;
    constexpr Circle() noexcept : radius(0.0f) {}
    constexpr Circle(const Vector2& c, float r) noexcept : center(c), radius(r) {}
};

struct Triangle2D {
    Vector2 a, b, c;
    constexpr Triangle2D() noexcept {}
    constexpr Triangle2D(const Vector2& a, const Vector2& b, const Vector2& c) noexcept : a(a), b(b), c(c) {}
};


// 3D Shapes

struct Point3D {
    Vector3 position;
    constexpr Point3D() noexcept : position(0.0f) {}
    constexpr Point3D(const Vector3& pos) noexcept : position(pos) {}
};

struct Line3D {
    Vector3 start;
    Vector3 end;
    constexpr Line3D() noexcept {}
    constexpr Line3D(const Vector3& s, const Vector3& e) noexcept : start(s), end(e) {}
};

struct Ray3D {
    Vector3 origin;
    Vector3 direction;
    constexpr Ray3D() noexcept {}
    constexpr Ray3D(const Vector3& o, const Vector3& d) noexcept : origin(o), direction(d) {}
};

struct Plane {
    Vector3 normal;
    float distance; // Distance from origin
    constexpr Plane() noexcept : distance(0.0f) {}
    constexpr Plane(const Vector3& n, float d) noexcept : normal(n), distance(d) {}
    constexpr Plane(const Vector3& n, const Vector3& p) noexcept : normal(n), distance(n.dot(p)) {}
};

struct Sphere {
    Vector3 center;
    float radius;
    constexpr Sphere() noexcept : radius(0.0f) {}
    constexpr Sphere(const Vector3& c, float r) noexcept : center(c), radius(r) {}
};

struct Capsule {
    Vector3 point_a;
    Vector3 point_b;
    float radius;
    constexpr Capsule() noexcept : radius(0.0f) {}
    constexpr Capsule(const Vector3& a, const Vector3& b, float r) noexcept : point_a(a), point_b(b), radius(r) {}
};

struct AABB {
    Vector3 min;
    Vector3 max;
    constexpr AABB() noexcept {}
    constexpr AABB(const Vector3& min, const Vector3& max) noexcept : min(min), max(max) {}

    constexpr Vector3 center() const noexcept { return (min + max) * 0.5f; }
    constexpr Vector3 extents() const noexcept { return (max - min) * 0.5f; }
};

struct OBB {
    Vector3 center;
    Vector3 extents;
    Vector3 axis[3];

    constexpr OBB() noexcept {}
    constexpr OBB(const Vector3& c, const Vector3& e, const Vector3 a[3]) noexcept
        : center(c), extents(e), axis{a[0], a[1], a[2]} {}
};

struct Triangle3D {
    Vector3 a, b, c;
    constexpr Triangle3D() noexcept {}
    constexpr Triangle3D(const Vector3& a, const Vector3& b, const Vector3& c) noexcept : a(a), b(b), c(c) {}
};

struct Frustum {
    Plane planes[6];

    constexpr Frustum() noexcept {}
};

} // namespace DungeonEngine::Math
