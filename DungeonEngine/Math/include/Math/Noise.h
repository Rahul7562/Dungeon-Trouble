#pragma once

#include "Vector2.h"
#include "Vector3.h"
#include <cstdint>

namespace DungeonEngine::Math {

// Base interface/concept for noise generation
class Noise {
public:
    virtual ~Noise() = default;

    virtual float get(float x, float y) const noexcept = 0;
    virtual float get(float x, float y, float z) const noexcept = 0;
};

// Value Noise (simple lattice noise)
class ValueNoise : public Noise {
public:
    explicit ValueNoise(uint32_t seed = 0) noexcept;

    float get(float x, float y) const noexcept override;
    float get(float x, float y, float z) const noexcept override;

private:
    uint8_t m_permutation[512];
    float m_values[256];
};

// Perlin Noise
class PerlinNoise : public Noise {
public:
    explicit PerlinNoise(uint32_t seed = 0) noexcept;

    float get(float x, float y) const noexcept override;
    float get(float x, float y, float z) const noexcept override;

private:
    uint8_t m_permutation[512];

    float grad(int hash, float x, float y) const noexcept;
    float grad(int hash, float x, float y, float z) const noexcept;
};

} // namespace DungeonEngine::Math
