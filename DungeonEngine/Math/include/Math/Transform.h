#pragma once

#include "Vector2.h"
#include "Vector3.h"
#include "Quaternion.h"
#include "Matrix3.h"
#include "Matrix4.h"

namespace DungeonEngine::Math {

struct Transform2D {
    Vector2 position;
    float rotation; // In radians
    Vector2 scale;

    constexpr Transform2D() noexcept : position(0.0f), rotation(0.0f), scale(1.0f) {}
    constexpr Transform2D(const Vector2& pos, float rot, const Vector2& scl) noexcept
        : position(pos), rotation(rot), scale(scl) {}

    Matrix3 toMatrix() const noexcept {
        float c = std::cos(rotation);
        float s = std::sin(rotation);

        return Matrix3(
            scale.x * c,  scale.y * s, 0.0f,
           -scale.x * s,  scale.y * c, 0.0f,
            position.x,   position.y,  1.0f
        );
    }

    Transform2D operator*(const Transform2D& child) const noexcept {
        // Compose transforms. child is in local space of this transform.
        float c = std::cos(rotation);
        float s = std::sin(rotation);

        // Rotate and scale the child position, then translate
        Vector2 rotatedPos(
            child.position.x * c - child.position.y * s,
            child.position.x * s + child.position.y * c
        );
        rotatedPos.x *= scale.x;
        rotatedPos.y *= scale.y;

        return Transform2D(
            position + rotatedPos,
            wrap(rotation + child.rotation, -PI, PI), // keep between -PI and PI
            scale * child.scale
        );
    }

    Vector2 transformPoint(const Vector2& point) const noexcept {
        float c = std::cos(rotation);
        float s = std::sin(rotation);

        Vector2 scaled(point.x * scale.x, point.y * scale.y);

        return Vector2(
            scaled.x * c - scaled.y * s + position.x,
            scaled.x * s + scaled.y * c + position.y
        );
    }
};

struct Transform3D {
    Vector3 position;
    Quaternion rotation;
    Vector3 scale;

    constexpr Transform3D() noexcept : position(0.0f), rotation(Quaternion::identity()), scale(1.0f) {}
    constexpr Transform3D(const Vector3& pos, const Quaternion& rot, const Vector3& scl) noexcept
        : position(pos), rotation(rot), scale(scl) {}

    Matrix4 toMatrix() const noexcept {
        Matrix4 translation = Matrix4::createTranslation(position);
        Matrix4 rotMatrix = rotation.toMatrix4();
        Matrix4 sclMatrix = Matrix4::createScale(scale);

        // T * R * S
        return translation * rotMatrix * sclMatrix;
    }

    Transform3D operator*(const Transform3D& child) const noexcept {
        return Transform3D(
            position + rotation.rotateVector(child.position * scale),
            rotation * child.rotation,
            scale * child.scale
        );
    }

    Vector3 transformPoint(const Vector3& point) const noexcept {
        return position + rotation.rotateVector(point * scale);
    }

    Vector3 getForward() const noexcept {
        return rotation.rotateVector(Vector3::forward());
    }

    Vector3 getUp() const noexcept {
        return rotation.rotateVector(Vector3::up());
    }

    Vector3 getRight() const noexcept {
        return rotation.rotateVector(Vector3::right());
    }
};

} // namespace DungeonEngine::Math
