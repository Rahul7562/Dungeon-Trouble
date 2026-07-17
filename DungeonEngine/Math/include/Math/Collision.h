#pragma once

#include "Geometry.h"

namespace DungeonEngine::Math {

class Collision {
public:
    // 2D Intersections
    static bool intersect(const Point2D& point, const Rectangle& rect) noexcept;
    static bool intersect(const Point2D& point, const Circle& circle) noexcept;
    static bool intersect(const Rectangle& a, const Rectangle& b) noexcept;
    static bool intersect(const Circle& a, const Circle& b) noexcept;
    static bool intersect(const Line2D& a, const Line2D& b) noexcept;

    // 3D Intersections
    static bool intersect(const Ray3D& ray, const Plane& plane, float& outDistance) noexcept;
    static bool intersect(const Ray3D& ray, const AABB& aabb, float& outDistance) noexcept;
    static bool intersect(const AABB& a, const AABB& b) noexcept;
    static bool intersect(const Sphere& a, const Sphere& b) noexcept;
};

} // namespace DungeonEngine::Math
