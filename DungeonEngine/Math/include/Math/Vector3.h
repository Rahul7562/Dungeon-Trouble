#pragma once

#include "MathUtils.h"
#include <cmath>

namespace DungeonEngine::Math {

struct Vector3 {
    float x;
    float y;
    float z;

    // Construction
    constexpr Vector3() noexcept : x(0.0f), y(0.0f), z(0.0f) {}
    constexpr Vector3(float scalar) noexcept : x(scalar), y(scalar), z(scalar) {}
    constexpr Vector3(float x, float y, float z) noexcept : x(x), y(y), z(z) {}

    // Arithmetic operators
    constexpr Vector3 operator+(const Vector3& rhs) const noexcept { return Vector3(x + rhs.x, y + rhs.y, z + rhs.z); }
    constexpr Vector3 operator-(const Vector3& rhs) const noexcept { return Vector3(x - rhs.x, y - rhs.y, z - rhs.z); }
    constexpr Vector3 operator*(const Vector3& rhs) const noexcept { return Vector3(x * rhs.x, y * rhs.y, z * rhs.z); }
    constexpr Vector3 operator/(const Vector3& rhs) const noexcept { return Vector3(x / rhs.x, y / rhs.y, z / rhs.z); }

    constexpr Vector3 operator*(float scalar) const noexcept { return Vector3(x * scalar, y * scalar, z * scalar); }
    constexpr Vector3 operator/(float scalar) const noexcept { return Vector3(x / scalar, y / scalar, z / scalar); }

    constexpr Vector3 operator-() const noexcept { return Vector3(-x, -y, -z); }

    constexpr Vector3& operator+=(const Vector3& rhs) noexcept { x += rhs.x; y += rhs.y; z += rhs.z; return *this; }
    constexpr Vector3& operator-=(const Vector3& rhs) noexcept { x -= rhs.x; y -= rhs.y; z -= rhs.z; return *this; }
    constexpr Vector3& operator*=(const Vector3& rhs) noexcept { x *= rhs.x; y *= rhs.y; z *= rhs.z; return *this; }
    constexpr Vector3& operator/=(const Vector3& rhs) noexcept { x /= rhs.x; y /= rhs.y; z /= rhs.z; return *this; }

    constexpr Vector3& operator*=(float scalar) noexcept { x *= scalar; y *= scalar; z *= scalar; return *this; }
    constexpr Vector3& operator/=(float scalar) noexcept { x /= scalar; y /= scalar; z /= scalar; return *this; }

    // Comparison
    bool operator==(const Vector3& rhs) const noexcept { return nearlyEqual(x, rhs.x) && nearlyEqual(y, rhs.y) && nearlyEqual(z, rhs.z); }
    bool operator!=(const Vector3& rhs) const noexcept { return !(*this == rhs); }

    // Vector operations
    constexpr float dot(const Vector3& rhs) const noexcept { return x * rhs.x + y * rhs.y + z * rhs.z; }
    constexpr Vector3 cross(const Vector3& rhs) const noexcept {
        return Vector3(
            y * rhs.z - z * rhs.y,
            z * rhs.x - x * rhs.z,
            x * rhs.y - y * rhs.x
        );
    }

    float lengthSquared() const noexcept { return dot(*this); }
    float length() const noexcept { return std::sqrt(lengthSquared()); }

    float distanceSquared(const Vector3& rhs) const noexcept { return (*this - rhs).lengthSquared(); }
    float distance(const Vector3& rhs) const noexcept { return (*this - rhs).length(); }

    void normalize() noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
            z *= invLen;
        }
    }

    Vector3 normalized() const noexcept {
        Vector3 result = *this;
        result.normalize();
        return result;
    }

    void safeNormalize(const Vector3& fallback = Vector3(0.0f, 0.0f, 0.0f)) noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
            z *= invLen;
        } else {
            *this = fallback;
        }
    }

    Vector3 safeNormalized(const Vector3& fallback = Vector3(0.0f, 0.0f, 0.0f)) const noexcept {
        Vector3 result = *this;
        result.safeNormalize(fallback);
        return result;
    }

    Vector3 reflect(const Vector3& normal) const noexcept {
        return *this - normal * (2.0f * dot(normal));
    }

    Vector3 project(const Vector3& normal) const noexcept {
        return normal * (dot(normal) / normal.lengthSquared());
    }

    float angleTo(const Vector3& rhs) const noexcept {
        float d = dot(rhs) / (length() * rhs.length());
        return std::acos(clamp(d, -1.0f, 1.0f));
    }

    static constexpr Vector3 zero() noexcept { return Vector3(0.0f, 0.0f, 0.0f); }
    static constexpr Vector3 one() noexcept { return Vector3(1.0f, 1.0f, 1.0f); }
    static constexpr Vector3 up() noexcept { return Vector3(0.0f, 1.0f, 0.0f); }
    static constexpr Vector3 down() noexcept { return Vector3(0.0f, -1.0f, 0.0f); }
    static constexpr Vector3 left() noexcept { return Vector3(-1.0f, 0.0f, 0.0f); }
    static constexpr Vector3 right() noexcept { return Vector3(1.0f, 0.0f, 0.0f); }
    static constexpr Vector3 forward() noexcept { return Vector3(0.0f, 0.0f, -1.0f); }
    static constexpr Vector3 back() noexcept { return Vector3(0.0f, 0.0f, 1.0f); }
};

inline constexpr Vector3 operator*(float scalar, const Vector3& vec) noexcept {
    return vec * scalar;
}

} // namespace DungeonEngine::Math
