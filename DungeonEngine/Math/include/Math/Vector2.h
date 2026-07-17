#pragma once

#include "MathUtils.h"
#include <cmath>

namespace DungeonEngine::Math {

struct Vector2 {
    float x;
    float y;

    // Construction
    constexpr Vector2() noexcept : x(0.0f), y(0.0f) {}
    constexpr Vector2(float scalar) noexcept : x(scalar), y(scalar) {}
    constexpr Vector2(float x, float y) noexcept : x(x), y(y) {}

    // Arithmetic operators
    constexpr Vector2 operator+(const Vector2& rhs) const noexcept { return Vector2(x + rhs.x, y + rhs.y); }
    constexpr Vector2 operator-(const Vector2& rhs) const noexcept { return Vector2(x - rhs.x, y - rhs.y); }
    constexpr Vector2 operator*(const Vector2& rhs) const noexcept { return Vector2(x * rhs.x, y * rhs.y); }
    constexpr Vector2 operator/(const Vector2& rhs) const noexcept { return Vector2(x / rhs.x, y / rhs.y); }

    constexpr Vector2 operator*(float scalar) const noexcept { return Vector2(x * scalar, y * scalar); }
    constexpr Vector2 operator/(float scalar) const noexcept { return Vector2(x / scalar, y / scalar); }

    constexpr Vector2 operator-() const noexcept { return Vector2(-x, -y); }

    constexpr Vector2& operator+=(const Vector2& rhs) noexcept { x += rhs.x; y += rhs.y; return *this; }
    constexpr Vector2& operator-=(const Vector2& rhs) noexcept { x -= rhs.x; y -= rhs.y; return *this; }
    constexpr Vector2& operator*=(const Vector2& rhs) noexcept { x *= rhs.x; y *= rhs.y; return *this; }
    constexpr Vector2& operator/=(const Vector2& rhs) noexcept { x /= rhs.x; y /= rhs.y; return *this; }

    constexpr Vector2& operator*=(float scalar) noexcept { x *= scalar; y *= scalar; return *this; }
    constexpr Vector2& operator/=(float scalar) noexcept { x /= scalar; y /= scalar; return *this; }

    // Comparison
    bool operator==(const Vector2& rhs) const noexcept { return nearlyEqual(x, rhs.x) && nearlyEqual(y, rhs.y); }
    bool operator!=(const Vector2& rhs) const noexcept { return !(*this == rhs); }

    // Vector operations
    constexpr float dot(const Vector2& rhs) const noexcept { return x * rhs.x + y * rhs.y; }
    constexpr float cross(const Vector2& rhs) const noexcept { return x * rhs.y - y * rhs.x; }

    float lengthSquared() const noexcept { return dot(*this); }
    float length() const noexcept { return std::sqrt(lengthSquared()); }

    float distanceSquared(const Vector2& rhs) const noexcept { return (*this - rhs).lengthSquared(); }
    float distance(const Vector2& rhs) const noexcept { return (*this - rhs).length(); }

    void normalize() noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
        }
    }

    Vector2 normalized() const noexcept {
        Vector2 result = *this;
        result.normalize();
        return result;
    }

    void safeNormalize(const Vector2& fallback = Vector2(0.0f, 0.0f)) noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
        } else {
            *this = fallback;
        }
    }

    Vector2 safeNormalized(const Vector2& fallback = Vector2(0.0f, 0.0f)) const noexcept {
        Vector2 result = *this;
        result.safeNormalize(fallback);
        return result;
    }

    Vector2 reflect(const Vector2& normal) const noexcept {
        return *this - normal * (2.0f * dot(normal));
    }

    Vector2 project(const Vector2& normal) const noexcept {
        return normal * (dot(normal) / normal.lengthSquared());
    }

    float angle() const noexcept {
        return std::atan2(y, x);
    }

    float angleTo(const Vector2& rhs) const noexcept {
        return std::atan2(cross(rhs), dot(rhs));
    }

    static constexpr Vector2 zero() noexcept { return Vector2(0.0f, 0.0f); }
    static constexpr Vector2 one() noexcept { return Vector2(1.0f, 1.0f); }
    static constexpr Vector2 up() noexcept { return Vector2(0.0f, 1.0f); }
    static constexpr Vector2 down() noexcept { return Vector2(0.0f, -1.0f); }
    static constexpr Vector2 left() noexcept { return Vector2(-1.0f, 0.0f); }
    static constexpr Vector2 right() noexcept { return Vector2(1.0f, 0.0f); }
};

inline constexpr Vector2 operator*(float scalar, const Vector2& vec) noexcept {
    return vec * scalar;
}

} // namespace DungeonEngine::Math
