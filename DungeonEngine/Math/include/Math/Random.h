#pragma once

#include "Vector2.h"
#include "Vector3.h"
#include "Color.h"
#include <cstdint>

namespace DungeonEngine::Math {

// Deterministic Pseudo-Random Number Generator based on PCG32 (Permuted Congruential Generator)
class Random {
public:
    Random() noexcept;
    explicit Random(uint64_t seed) noexcept;

    void seed(uint64_t seed) noexcept;

    // Core generator: returns random uint32_t
    uint32_t next() noexcept;

    // Random floats in [0, 1)
    float getFloat() noexcept;

    // Random float in [min, max)
    float getFloat(float min, float max) noexcept;

    // Random integers in [min, max]
    int getInt(int min, int max) noexcept;

    // Random boolean
    bool getBool() noexcept;

    // Random Vector2 inside unit circle
    Vector2 getVector2InCircle() noexcept;

    // Random unit Vector2 (direction)
    Vector2 getUnitVector2() noexcept;

    // Random unit Vector3 (direction)
    Vector3 getUnitVector3() noexcept;

    // Random Vector3 inside unit sphere
    Vector3 getVector3InSphere() noexcept;

    // Random Color (alpha is 1.0)
    Color getColor() noexcept;

private:
    uint64_t state;
    uint64_t inc; // Stream id
};

} // namespace DungeonEngine::Math
