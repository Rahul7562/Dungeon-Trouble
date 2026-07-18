#pragma once

#include "Vector3.h"

namespace DungeonEngine::Math {

// Column-major 3x3 Matrix
struct Matrix3 {
    // Columns
    Vector3 col[3];

    constexpr Matrix3() noexcept
        : col{Vector3(1.0f, 0.0f, 0.0f), Vector3(0.0f, 1.0f, 0.0f), Vector3(0.0f, 0.0f, 1.0f)} {}

    constexpr Matrix3(const Vector3& c0, const Vector3& c1, const Vector3& c2) noexcept
        : col{c0, c1, c2} {}

    constexpr Matrix3(float m00, float m10, float m20,
                      float m01, float m11, float m21,
                      float m02, float m12, float m22) noexcept
        : col{Vector3(m00, m10, m20), Vector3(m01, m11, m21), Vector3(m02, m12, m22)} {}

    const float* data() const noexcept { return &col[0].x; }
    float* data() noexcept { return &col[0].x; }

    constexpr float& operator()(int row, int column) noexcept { return (&col[column].x)[row]; }
    constexpr float operator()(int row, int column) const noexcept { return (&col[column].x)[row]; }

    constexpr Vector3& operator[](int column) noexcept { return col[column]; }
    constexpr const Vector3& operator[](int column) const noexcept { return col[column]; }

    static constexpr Matrix3 identity() noexcept {
        return Matrix3();
    }

    constexpr Matrix3 operator*(const Matrix3& rhs) const noexcept {
        return Matrix3(
            col[0].x * rhs.col[0].x + col[1].x * rhs.col[0].y + col[2].x * rhs.col[0].z,
            col[0].y * rhs.col[0].x + col[1].y * rhs.col[0].y + col[2].y * rhs.col[0].z,
            col[0].z * rhs.col[0].x + col[1].z * rhs.col[0].y + col[2].z * rhs.col[0].z,

            col[0].x * rhs.col[1].x + col[1].x * rhs.col[1].y + col[2].x * rhs.col[1].z,
            col[0].y * rhs.col[1].x + col[1].y * rhs.col[1].y + col[2].y * rhs.col[1].z,
            col[0].z * rhs.col[1].x + col[1].z * rhs.col[1].y + col[2].z * rhs.col[1].z,

            col[0].x * rhs.col[2].x + col[1].x * rhs.col[2].y + col[2].x * rhs.col[2].z,
            col[0].y * rhs.col[2].x + col[1].y * rhs.col[2].y + col[2].y * rhs.col[2].z,
            col[0].z * rhs.col[2].x + col[1].z * rhs.col[2].y + col[2].z * rhs.col[2].z
        );
    }

    constexpr Vector3 operator*(const Vector3& rhs) const noexcept {
        return Vector3(
            col[0].x * rhs.x + col[1].x * rhs.y + col[2].x * rhs.z,
            col[0].y * rhs.x + col[1].y * rhs.y + col[2].y * rhs.z,
            col[0].z * rhs.x + col[1].z * rhs.y + col[2].z * rhs.z
        );
    }

    constexpr Matrix3 transpose() const noexcept {
        return Matrix3(
            col[0].x, col[1].x, col[2].x,
            col[0].y, col[1].y, col[2].y,
            col[0].z, col[1].z, col[2].z
        );
    }

    constexpr float determinant() const noexcept {
        return col[0].x * (col[1].y * col[2].z - col[2].y * col[1].z)
             - col[1].x * (col[0].y * col[2].z - col[2].y * col[0].z)
             + col[2].x * (col[0].y * col[1].z - col[1].y * col[0].z);
    }

    Matrix3 inverse() const noexcept {
        float det = determinant();
        if (std::abs(det) < EPSILON) {
            return identity(); // Fallback
        }
        float invDet = 1.0f / det;
        return Matrix3(
             (col[1].y * col[2].z - col[2].y * col[1].z) * invDet,
            -(col[0].y * col[2].z - col[2].y * col[0].z) * invDet,
             (col[0].y * col[1].z - col[1].y * col[0].z) * invDet,

            -(col[1].x * col[2].z - col[2].x * col[1].z) * invDet,
             (col[0].x * col[2].z - col[2].x * col[0].z) * invDet,
            -(col[0].x * col[1].z - col[1].x * col[0].z) * invDet,

             (col[1].x * col[2].y - col[2].x * col[1].y) * invDet,
            -(col[0].x * col[2].y - col[2].x * col[0].y) * invDet,
             (col[0].x * col[1].y - col[1].x * col[0].y) * invDet
        );
    }

    static Matrix3 createRotationZ(float radians) noexcept {
        float c = std::cos(radians);
        float s = std::sin(radians);
        return Matrix3(
             c,  s, 0.0f,
            -s,  c, 0.0f,
          0.0f, 0.0f, 1.0f
        );
    }

    static constexpr Matrix3 createScale(float x, float y) noexcept {
        return Matrix3(
             x, 0.0f, 0.0f,
          0.0f,    y, 0.0f,
          0.0f, 0.0f, 1.0f
        );
    }

    static constexpr Matrix3 createTranslation(float x, float y) noexcept {
        return Matrix3(
          1.0f, 0.0f, 0.0f,
          0.0f, 1.0f, 0.0f,
             x,    y, 1.0f
        );
    }
};

} // namespace DungeonEngine::Math
