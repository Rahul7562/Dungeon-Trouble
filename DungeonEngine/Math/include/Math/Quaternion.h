#pragma once

#include "Vector3.h"
#include "Matrix4.h"
#include "Matrix3.h"
#include <cmath>

namespace DungeonEngine::Math {

struct Quaternion {
    float x;
    float y;
    float z;
    float w;

    constexpr Quaternion() noexcept : x(0.0f), y(0.0f), z(0.0f), w(1.0f) {}
    constexpr Quaternion(float x, float y, float z, float w) noexcept : x(x), y(y), z(z), w(w) {}

    static constexpr Quaternion identity() noexcept { return Quaternion(); }

    bool operator==(const Quaternion& rhs) const noexcept {
        return nearlyEqual(x, rhs.x) && nearlyEqual(y, rhs.y) && nearlyEqual(z, rhs.z) && nearlyEqual(w, rhs.w);
    }
    bool operator!=(const Quaternion& rhs) const noexcept { return !(*this == rhs); }

    constexpr Quaternion operator*(const Quaternion& rhs) const noexcept {
        return Quaternion(
            w * rhs.x + x * rhs.w + y * rhs.z - z * rhs.y,
            w * rhs.y - x * rhs.z + y * rhs.w + z * rhs.x,
            w * rhs.z + x * rhs.y - y * rhs.x + z * rhs.w,
            w * rhs.w - x * rhs.x - y * rhs.y - z * rhs.z
        );
    }

    constexpr Quaternion& operator*=(const Quaternion& rhs) noexcept {
        *this = *this * rhs;
        return *this;
    }

    constexpr float dot(const Quaternion& rhs) const noexcept {
        return x * rhs.x + y * rhs.y + z * rhs.z + w * rhs.w;
    }

    float lengthSquared() const noexcept { return dot(*this); }
    float length() const noexcept { return std::sqrt(lengthSquared()); }

    void normalize() noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLen = 1.0f / std::sqrt(lenSq);
            x *= invLen;
            y *= invLen;
            z *= invLen;
            w *= invLen;
        } else {
            *this = identity();
        }
    }

    Quaternion normalized() const noexcept {
        Quaternion result = *this;
        result.normalize();
        return result;
    }

    constexpr Quaternion conjugate() const noexcept {
        return Quaternion(-x, -y, -z, w);
    }

    Quaternion inverse() const noexcept {
        float lenSq = lengthSquared();
        if (lenSq > EPSILON) {
            float invLenSq = 1.0f / lenSq;
            return Quaternion(-x * invLenSq, -y * invLenSq, -z * invLenSq, w * invLenSq);
        }
        return identity();
    }

    constexpr Vector3 rotateVector(const Vector3& v) const noexcept {
        // q * v * q^-1
        Vector3 qv(x, y, z);
        Vector3 uv = qv.cross(v);
        Vector3 uuv = qv.cross(uv);

        uv *= (2.0f * w);
        uuv *= 2.0f;

        return v + uv + uuv;
    }

    static Quaternion createFromAxisAngle(const Vector3& axis, float angleRadians) noexcept {
        float halfAngle = angleRadians * 0.5f;
        float s = std::sin(halfAngle);

        Vector3 normAxis = axis.normalized();
        return Quaternion(normAxis.x * s, normAxis.y * s, normAxis.z * s, std::cos(halfAngle));
    }

    // Euler angles in radians. Yaw (Y), Pitch (X), Roll (Z). Order: Y -> X -> Z
    static Quaternion createFromEuler(float pitch, float yaw, float roll) noexcept {
        float halfPitch = pitch * 0.5f;
        float halfYaw = yaw * 0.5f;
        float halfRoll = roll * 0.5f;

        float cx = std::cos(halfPitch);
        float sx = std::sin(halfPitch);
        float cy = std::cos(halfYaw);
        float sy = std::sin(halfYaw);
        float cz = std::cos(halfRoll);
        float sz = std::sin(halfRoll);

        return Quaternion(
            sx * cy * cz + cx * sy * sz,
            cx * sy * cz - sx * cy * sz,
            cx * cy * sz + sx * sy * cz,
            cx * cy * cz - sx * sy * sz
        );
    }

    static Quaternion slerp(const Quaternion& a, const Quaternion& b, float t) noexcept {
        float cosTheta = a.dot(b);
        Quaternion end = b;

        // Take shortest path
        if (cosTheta < 0.0f) {
            end.x = -end.x; end.y = -end.y; end.z = -end.z; end.w = -end.w;
            cosTheta = -cosTheta;
        }

        if (cosTheta > 1.0f - EPSILON) {
            // Linear interpolation for small angles
            Quaternion result(
                a.x + t * (end.x - a.x),
                a.y + t * (end.y - a.y),
                a.z + t * (end.z - a.z),
                a.w + t * (end.w - a.w)
            );
            return result.normalized();
        }

        float theta = std::acos(cosTheta);
        float sinTheta = std::sin(theta);

        float wA = std::sin((1.0f - t) * theta) / sinTheta;
        float wB = std::sin(t * theta) / sinTheta;

        return Quaternion(
            wA * a.x + wB * end.x,
            wA * a.y + wB * end.y,
            wA * a.z + wB * end.z,
            wA * a.w + wB * end.w
        );
    }

    Matrix4 toMatrix4() const noexcept {
        float xx = x * x;
        float yy = y * y;
        float zz = z * z;
        float xz = x * z;
        float xy = x * y;
        float yz = y * z;
        float wx = w * x;
        float wy = w * y;
        float wz = w * z;

        return Matrix4(
            1.0f - 2.0f * (yy + zz), 2.0f * (xy + wz),        2.0f * (xz - wy),        0.0f,
            2.0f * (xy - wz),        1.0f - 2.0f * (xx + zz), 2.0f * (yz + wx),        0.0f,
            2.0f * (xz + wy),        2.0f * (yz - wx),        1.0f - 2.0f * (xx + yy), 0.0f,
            0.0f,                    0.0f,                    0.0f,                    1.0f
        );
    }
};

} // namespace DungeonEngine::Math
