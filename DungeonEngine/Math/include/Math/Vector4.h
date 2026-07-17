#pragma once

#include "MathUtils.h"
#include <cmath>

namespace DungeonEngine::Math {

struct Vector4 {
    float x;
    float y;
    float z;
    float w;

    // Construction
    constexpr Vector4() noexcept : x(0.0f), y(0.0f), z(0.0f), w(0.0f) {}
    constexpr Vector4(float scalar) noexcept : x(scalar), y(scalar), z(scalar), w(scalar) {}
    constexpr Vector4(float x, float y, float z, float w) noexcept : x(x), y(y), z(z), w(w) {}

    // Arithmetic operators
    constexpr Vector4 operator+(const Vector4& rhs) const noexcept { return Vector4(x + rhs.x, y + rhs.y, z + rhs.z, w + rhs.w); }
    constexpr Vector4 operator-(const Vector4& rhs) const noexcept { return Vector4(x - rhs.x, y - rhs.y, z - rhs.z, w - rhs.w); }
    constexpr Vector4 operator*(const Vector4& rhs) const noexcept { return Vector4(x * rhs.x, y * rhs.y, z * rhs.z, w * rhs.w); }
    constexpr Vector4 operator/(const Vector4& rhs) const noexcept { return Vector4(x / rhs.x, y / rhs.y, z / rhs.z, w / rhs.w); }

    constexpr Vector4 operator*(float scalar) const noexcept { return Vector4(x * scalar, y * scalar, z * scalar, w * scalar); }
    constexpr Vector4 operator/(float scalar) const noexcept { return Vector4(x / scalar, y / scalar, z / scalar, w / scalar); }

    constexpr Vector4 operator-() const noexcept { return Vector4(-x, -y, -z, -w); }

    constexpr Vector4& operator+=(const Vector4& rhs) noexcept { x += rhs.x; y += rhs.y; z += rhs.z; w += rhs.w; return *this; }
    constexpr Vector4& operator-=(const Vector4& rhs) noexcept { x -= rhs.x; y -= rhs.y; z -= rhs.z; w -= rhs.w; return *this; }
    constexpr Vector4& operator*=(const Vector4& rhs) noexcept { x *= rhs.x; y *= rhs.y; z *= rhs.z; w *= rhs.w; return *this; }
    constexpr Vector4& operator/=(const Vector4& rhs) noexcept { x /= rhs.x; y /= rhs.y; z /= rhs.z; w /= rhs.w; return *this; }

    constexpr Vector4& operator*=(float scalar) noexcept { x *= scalar; y *= scalar; z *= scalar; w *= scalar; return *this; }
    constexpr Vector4& operator/=(float scalar) noexcept { x /= scalar; y /= scalar; z /= scalar; w /= scalar; return *this; }

    // Comparison
    bool operator==(const Vector4& rhs) const noexcept { return nearlyEqual(x, rhs.x) && nearlyEqual(y, rhs.y) && nearlyEqual(z, rhs.z) && nearlyEqual(w, rhs.w); }
    bool operator!=(const Vector4& rhs) const noexcept { return !(*this == rhs); }

    // Vector operations
    constexpr float dot(const Vector4& rhs) const noexcept { return x * rhs.x + y * rhs.y + z * rhs.z + w * rhs.w; }

    float lengthSquared() const noexcept { return dot(*this); }
    float length() const noexcept { return std::sqrt(lengthSquared()); }

    float distanceSquared(const Vector4& rhs) const noexcept { return (*this - rhs).lengthSquared(); }
    float distance(const Vector4& rhs) const noexcept { return (*this - rhs).length(); }

    void normalize() noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
            z *= invLen;
            w *= invLen;
        }
    }

    Vector4 normalized() const noexcept {
        Vector4 result = *this;
        result.normalize();
        return result;
    }

    void safeNormalize(const Vector4& fallback = Vector4(0.0f, 0.0f, 0.0f, 0.0f)) noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
            z *= invLen;
            w *= invLen;
        } else {
            *this = fallback;
        }
    }

    Vector4 safeNormalized(const Vector4& fallback = Vector4(0.0f, 0.0f, 0.0f, 0.0f)) const noexcept {
        Vector4 result = *this;
        result.safeNormalize(fallback);
        return result;
    }

    static constexpr Vector4 zero() noexcept { return Vector4(0.0f, 0.0f, 0.0f, 0.0f); }
    static constexpr Vector4 one() noexcept { return Vector4(1.0f, 1.0f, 1.0f, 1.0f); }
};

inline constexpr Vector4 operator*(float scalar, const Vector4& vec) noexcept {
    return vec * scalar;
}

} // namespace DungeonEngine::Math
