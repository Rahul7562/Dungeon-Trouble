#pragma once

#include "Vector4.h"
#include "Vector3.h"
#include "Matrix3.h"

namespace DungeonEngine::Math {

// Column-major 4x4 Matrix
struct Matrix4 {
    Vector4 col[4];

    constexpr Matrix4() noexcept
        : col{Vector4(1.0f, 0.0f, 0.0f, 0.0f),
              Vector4(0.0f, 1.0f, 0.0f, 0.0f),
              Vector4(0.0f, 0.0f, 1.0f, 0.0f),
              Vector4(0.0f, 0.0f, 0.0f, 1.0f)} {}

    constexpr Matrix4(const Vector4& c0, const Vector4& c1, const Vector4& c2, const Vector4& c3) noexcept
        : col{c0, c1, c2, c3} {}

    constexpr Matrix4(float m00, float m10, float m20, float m30,
                      float m01, float m11, float m21, float m31,
                      float m02, float m12, float m22, float m32,
                      float m03, float m13, float m23, float m33) noexcept
        : col{Vector4(m00, m10, m20, m30),
              Vector4(m01, m11, m21, m31),
              Vector4(m02, m12, m22, m32),
              Vector4(m03, m13, m23, m33)} {}

    const float* data() const noexcept { return &col[0].x; }
    float* data() noexcept { return &col[0].x; }

    constexpr float& operator()(int row, int column) noexcept { return (&col[column].x)[row]; }
    constexpr float operator()(int row, int column) const noexcept { return (&col[column].x)[row]; }

    constexpr Vector4& operator[](int column) noexcept { return col[column]; }
    constexpr const Vector4& operator[](int column) const noexcept { return col[column]; }

    static constexpr Matrix4 identity() noexcept { return Matrix4(); }

    constexpr Matrix4 operator*(const Matrix4& rhs) const noexcept {
        return Matrix4(
            // Col 0
            col[0].x * rhs.col[0].x + col[1].x * rhs.col[0].y + col[2].x * rhs.col[0].z + col[3].x * rhs.col[0].w,
            col[0].y * rhs.col[0].x + col[1].y * rhs.col[0].y + col[2].y * rhs.col[0].z + col[3].y * rhs.col[0].w,
            col[0].z * rhs.col[0].x + col[1].z * rhs.col[0].y + col[2].z * rhs.col[0].z + col[3].z * rhs.col[0].w,
            col[0].w * rhs.col[0].x + col[1].w * rhs.col[0].y + col[2].w * rhs.col[0].z + col[3].w * rhs.col[0].w,
            // Col 1
            col[0].x * rhs.col[1].x + col[1].x * rhs.col[1].y + col[2].x * rhs.col[1].z + col[3].x * rhs.col[1].w,
            col[0].y * rhs.col[1].x + col[1].y * rhs.col[1].y + col[2].y * rhs.col[1].z + col[3].y * rhs.col[1].w,
            col[0].z * rhs.col[1].x + col[1].z * rhs.col[1].y + col[2].z * rhs.col[1].z + col[3].z * rhs.col[1].w,
            col[0].w * rhs.col[1].x + col[1].w * rhs.col[1].y + col[2].w * rhs.col[1].z + col[3].w * rhs.col[1].w,
            // Col 2
            col[0].x * rhs.col[2].x + col[1].x * rhs.col[2].y + col[2].x * rhs.col[2].z + col[3].x * rhs.col[2].w,
            col[0].y * rhs.col[2].x + col[1].y * rhs.col[2].y + col[2].y * rhs.col[2].z + col[3].y * rhs.col[2].w,
            col[0].z * rhs.col[2].x + col[1].z * rhs.col[2].y + col[2].z * rhs.col[2].z + col[3].z * rhs.col[2].w,
            col[0].w * rhs.col[2].x + col[1].w * rhs.col[2].y + col[2].w * rhs.col[2].z + col[3].w * rhs.col[2].w,
            // Col 3
            col[0].x * rhs.col[3].x + col[1].x * rhs.col[3].y + col[2].x * rhs.col[3].z + col[3].x * rhs.col[3].w,
            col[0].y * rhs.col[3].x + col[1].y * rhs.col[3].y + col[2].y * rhs.col[3].z + col[3].y * rhs.col[3].w,
            col[0].z * rhs.col[3].x + col[1].z * rhs.col[3].y + col[2].z * rhs.col[3].z + col[3].z * rhs.col[3].w,
            col[0].w * rhs.col[3].x + col[1].w * rhs.col[3].y + col[2].w * rhs.col[3].z + col[3].w * rhs.col[3].w
        );
    }

    constexpr Vector4 operator*(const Vector4& rhs) const noexcept {
        return Vector4(
            col[0].x * rhs.x + col[1].x * rhs.y + col[2].x * rhs.z + col[3].x * rhs.w,
            col[0].y * rhs.x + col[1].y * rhs.y + col[2].y * rhs.z + col[3].y * rhs.w,
            col[0].z * rhs.x + col[1].z * rhs.y + col[2].z * rhs.z + col[3].z * rhs.w,
            col[0].w * rhs.x + col[1].w * rhs.y + col[2].w * rhs.z + col[3].w * rhs.w
        );
    }

    constexpr Matrix4 transpose() const noexcept {
        return Matrix4(
            col[0].x, col[1].x, col[2].x, col[3].x,
            col[0].y, col[1].y, col[2].y, col[3].y,
            col[0].z, col[1].z, col[2].z, col[3].z,
            col[0].w, col[1].w, col[2].w, col[3].w
        );
    }

    float determinant() const noexcept {
        float coef00 = col[2].z * col[3].w - col[3].z * col[2].w;
        float coef02 = col[1].z * col[3].w - col[3].z * col[1].w;
        float coef03 = col[1].z * col[2].w - col[2].z * col[1].w;

        float coef04 = col[2].y * col[3].w - col[3].y * col[2].w;
        float coef06 = col[1].y * col[3].w - col[3].y * col[1].w;
        float coef07 = col[1].y * col[2].w - col[2].y * col[1].w;

        float coef08 = col[2].y * col[3].z - col[3].y * col[2].z;
        float coef10 = col[1].y * col[3].z - col[3].y * col[1].z;
        float coef11 = col[1].y * col[2].z - col[2].y * col[1].z;

        float fac0 = col[1].y * coef00 - col[2].y * coef02 + col[3].y * coef03;
        float fac1 = col[1].x * coef00 - col[2].x * coef02 + col[3].x * coef03;
        float fac2 = col[1].x * coef04 - col[2].x * coef06 + col[3].x * coef07;
        float fac3 = col[1].x * coef08 - col[2].x * coef10 + col[3].x * coef11;

        return col[0].x * fac0 - col[0].y * fac1 + col[0].z * fac2 - col[0].w * fac3;
    }

    Matrix4 inverse() const noexcept {
        float coef00 = col[2].z * col[3].w - col[3].z * col[2].w;
        float coef02 = col[1].z * col[3].w - col[3].z * col[1].w;
        float coef03 = col[1].z * col[2].w - col[2].z * col[1].w;

        float coef04 = col[2].y * col[3].w - col[3].y * col[2].w;
        float coef06 = col[1].y * col[3].w - col[3].y * col[1].w;
        float coef07 = col[1].y * col[2].w - col[2].y * col[1].w;

        float coef08 = col[2].y * col[3].z - col[3].y * col[2].z;
        float coef10 = col[1].y * col[3].z - col[3].y * col[1].z;
        float coef11 = col[1].y * col[2].z - col[2].y * col[1].z;

        float coef12 = col[2].x * col[3].w - col[3].x * col[2].w;
        float coef14 = col[1].x * col[3].w - col[3].x * col[1].w;
        float coef15 = col[1].x * col[2].w - col[2].x * col[1].w;

        float coef16 = col[2].x * col[3].z - col[3].x * col[2].z;
        float coef18 = col[1].x * col[3].z - col[3].x * col[1].z;
        float coef19 = col[1].x * col[2].z - col[2].x * col[1].z;

        float coef20 = col[2].x * col[3].y - col[3].x * col[2].y;
        float coef22 = col[1].x * col[3].y - col[3].x * col[1].y;
        float coef23 = col[1].x * col[2].y - col[2].x * col[1].y;

        Vector4 fac0(coef00, coef00, coef02, coef03);
        Vector4 fac1(coef04, coef04, coef06, coef07);
        Vector4 fac2(coef08, coef08, coef10, coef11);
        Vector4 fac3(coef12, coef12, coef14, coef15);
        Vector4 fac4(coef16, coef16, coef18, coef19);
        Vector4 fac5(coef20, coef20, coef22, coef23);

        Vector4 vec0(col[1].x, col[0].x, col[0].x, col[0].x);
        Vector4 vec1(col[1].y, col[0].y, col[0].y, col[0].y);
        Vector4 vec2(col[1].z, col[0].z, col[0].z, col[0].z);
        Vector4 vec3(col[1].w, col[0].w, col[0].w, col[0].w);

        Vector4 inv0(vec1 * fac0 - vec2 * fac1 + vec3 * fac2);
        Vector4 inv1(vec0 * fac0 - vec2 * fac3 + vec3 * fac4);
        Vector4 inv2(vec0 * fac1 - vec1 * fac3 + vec3 * fac5);
        Vector4 inv3(vec0 * fac2 - vec1 * fac4 + vec2 * fac5);

        Vector4 signA(+1, -1, +1, -1);
        Vector4 signB(-1, +1, -1, +1);
        Matrix4 inverse(inv0 * signA, inv1 * signB, inv2 * signA, inv3 * signB);

        float det = col[0].x * inverse.col[0].x + col[0].y * inverse.col[1].x + col[0].z * inverse.col[2].x + col[0].w * inverse.col[3].x;

        if (std::abs(det) < EPSILON) {
            return identity(); // Fallback
        }

        Matrix4 result;
        for(int i = 0; i < 4; i++) {
            result.col[i] = inverse.col[i] / det;
        }
        return result;
    }

    static constexpr Matrix4 createTranslation(const Vector3& translation) noexcept {
        return Matrix4(
            1.0f, 0.0f, 0.0f, 0.0f,
            0.0f, 1.0f, 0.0f, 0.0f,
            0.0f, 0.0f, 1.0f, 0.0f,
            translation.x, translation.y, translation.z, 1.0f
        );
    }

    static constexpr Matrix4 createScale(const Vector3& scale) noexcept {
        return Matrix4(
            scale.x, 0.0f, 0.0f, 0.0f,
            0.0f, scale.y, 0.0f, 0.0f,
            0.0f, 0.0f, scale.z, 0.0f,
            0.0f, 0.0f, 0.0f, 1.0f
        );
    }

    static Matrix4 createRotationX(float radians) noexcept {
        float c = std::cos(radians);
        float s = std::sin(radians);
        return Matrix4(
            1.0f, 0.0f, 0.0f, 0.0f,
            0.0f,    c,    s, 0.0f,
            0.0f,   -s,    c, 0.0f,
            0.0f, 0.0f, 0.0f, 1.0f
        );
    }

    static Matrix4 createRotationY(float radians) noexcept {
        float c = std::cos(radians);
        float s = std::sin(radians);
        return Matrix4(
               c, 0.0f,   -s, 0.0f,
            0.0f, 1.0f, 0.0f, 0.0f,
               s, 0.0f,    c, 0.0f,
            0.0f, 0.0f, 0.0f, 1.0f
        );
    }

    static Matrix4 createRotationZ(float radians) noexcept {
        float c = std::cos(radians);
        float s = std::sin(radians);
        return Matrix4(
               c,    s, 0.0f, 0.0f,
              -s,    c, 0.0f, 0.0f,
            0.0f, 0.0f, 1.0f, 0.0f,
            0.0f, 0.0f, 0.0f, 1.0f
        );
    }

    // Creates an orthographic projection matrix for a right-handed, Y-up coordinate system
    static constexpr Matrix4 createOrthographic(float left, float right, float bottom, float top, float zNear, float zFar) noexcept {
        float rl = 1.0f / (right - left);
        float tb = 1.0f / (top - bottom);
        float fn = 1.0f / (zFar - zNear);

        return Matrix4(
            2.0f * rl, 0.0f, 0.0f, 0.0f,
            0.0f, 2.0f * tb, 0.0f, 0.0f,
            0.0f, 0.0f, -2.0f * fn, 0.0f,
            -(right + left) * rl, -(top + bottom) * tb, -(zFar + zNear) * fn, 1.0f
        );
    }

    // Creates a perspective projection matrix for a right-handed, Y-up coordinate system
    static Matrix4 createPerspective(float fovYRadians, float aspect, float zNear, float zFar) noexcept {
        float tanHalfFovy = std::tan(fovYRadians / 2.0f);

        Matrix4 result = Matrix4::identity();
        result.col[0].x = 1.0f / (aspect * tanHalfFovy);
        result.col[1].y = 1.0f / (tanHalfFovy);
        result.col[2].z = -(zFar + zNear) / (zFar - zNear);
        result.col[2].w = -1.0f;
        result.col[3].z = -(2.0f * zFar * zNear) / (zFar - zNear);
        result.col[3].w = 0.0f;
        return result;
    }

    static Matrix4 lookAt(const Vector3& eye, const Vector3& center, const Vector3& up) noexcept {
        Vector3 f = (center - eye).normalized();
        Vector3 s = f.cross(up).normalized();
        Vector3 u = s.cross(f);

        Matrix4 result = Matrix4::identity();
        result.col[0].x = s.x;
        result.col[1].x = s.y;
        result.col[2].x = s.z;
        result.col[0].y = u.x;
        result.col[1].y = u.y;
        result.col[2].y = u.z;
        result.col[0].z = -f.x;
        result.col[1].z = -f.y;
        result.col[2].z = -f.z;
        result.col[3].x = -s.dot(eye);
        result.col[3].y = -u.dot(eye);
        result.col[3].z = f.dot(eye);
        return result;
    }
};

} // namespace DungeonEngine::Math
