#include "Math/Collision.h"
#include <cmath>
#include <algorithm>

namespace DungeonEngine::Math {

// 2D Intersections

bool Collision::intersect(const Point2D& point, const Rectangle& rect) noexcept {
    Vector2 min = rect.min();
    Vector2 max = rect.max();
    return point.position.x >= min.x && point.position.x <= max.x &&
           point.position.y >= min.y && point.position.y <= max.y;
}

bool Collision::intersect(const Point2D& point, const Circle& circle) noexcept {
    return point.position.distanceSquared(circle.center) <= (circle.radius * circle.radius);
}

bool Collision::intersect(const Rectangle& a, const Rectangle& b) noexcept {
    Vector2 aMin = a.min();
    Vector2 aMax = a.max();
    Vector2 bMin = b.min();
    Vector2 bMax = b.max();

    return aMin.x <= bMax.x && aMax.x >= bMin.x &&
           aMin.y <= bMax.y && aMax.y >= bMin.y;
}

bool Collision::intersect(const Circle& a, const Circle& b) noexcept {
    float radiiSum = a.radius + b.radius;
    return a.center.distanceSquared(b.center) <= (radiiSum * radiiSum);
}

bool Collision::intersect(const Line2D& a, const Line2D& b) noexcept {
    float q = (a.start.y - b.start.y) * (b.end.x - b.start.x) - (a.start.x - b.start.x) * (b.end.y - b.start.y);
    float d = (a.end.x - a.start.x) * (b.end.y - b.start.y) - (a.end.y - a.start.y) * (b.end.x - b.start.x);

    if (nearlyEqual(d, 0.0f)) {
        return false; // parallel
    }

    float u = q / d;

    q = (a.start.y - b.start.y) * (a.end.x - a.start.x) - (a.start.x - b.start.x) * (a.end.y - a.start.y);
    float v = q / d;

    return u >= 0.0f && u <= 1.0f && v >= 0.0f && v <= 1.0f;
}

// 3D Intersections

bool Collision::intersect(const Ray3D& ray, const Plane& plane, float& outDistance) noexcept {
    float nd = ray.direction.dot(plane.normal);
    if (nearlyEqual(nd, 0.0f)) {
        return false; // Ray is parallel to the plane
    }

    float pn = ray.origin.dot(plane.normal);
    outDistance = (plane.distance - pn) / nd;

    return outDistance >= 0.0f; // Must intersect in front of ray origin
}

bool Collision::intersect(const Ray3D& ray, const AABB& aabb, float& outDistance) noexcept {
    float tmin = (aabb.min.x - ray.origin.x) / ray.direction.x;
    float tmax = (aabb.max.x - ray.origin.x) / ray.direction.x;

    if (tmin > tmax) std::swap(tmin, tmax);

    float tymin = (aabb.min.y - ray.origin.y) / ray.direction.y;
    float tymax = (aabb.max.y - ray.origin.y) / ray.direction.y;

    if (tymin > tymax) std::swap(tymin, tymax);

    if ((tmin > tymax) || (tymin > tmax)) return false;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    float tzmin = (aabb.min.z - ray.origin.z) / ray.direction.z;
    float tzmax = (aabb.max.z - ray.origin.z) / ray.direction.z;

    if (tzmin > tzmax) std::swap(tzmin, tzmax);

    if ((tmin > tzmax) || (tzmin > tmax)) return false;

    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    if (tmin < 0.0f && tmax < 0.0f) return false;

    outDistance = tmin < 0.0f ? tmax : tmin;
    return true;
}

bool Collision::intersect(const AABB& a, const AABB& b) noexcept {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
}

bool Collision::intersect(const Sphere& a, const Sphere& b) noexcept {
    float radiiSum = a.radius + b.radius;
    return a.center.distanceSquared(b.center) <= (radiiSum * radiiSum);
}

} // namespace DungeonEngine::Math
