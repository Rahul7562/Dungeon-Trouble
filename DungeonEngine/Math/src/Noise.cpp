#include "Math/Noise.h"
#include "Math/Random.h"
#include "Math/Interpolation.h"
#include <numeric>

namespace DungeonEngine::Math {

// Value Noise

ValueNoise::ValueNoise(uint32_t seed) noexcept {
    Random rng(seed);
    for (int i = 0; i < 256; ++i) {
        m_permutation[i] = static_cast<uint8_t>(i);
        m_values[i] = rng.getFloat();
    }

    // Shuffle permutation array
    for (int i = 255; i > 0; --i) {
        int j = rng.getInt(0, i);
        std::swap(m_permutation[i], m_permutation[j]);
    }

    // Duplicate to avoid wrapping
    for (int i = 0; i < 256; ++i) {
        m_permutation[256 + i] = m_permutation[i];
    }
}

float ValueNoise::get(float x, float y) const noexcept {
    int xi = static_cast<int>(std::floor(x));
    int yi = static_cast<int>(std::floor(y));

    float tx = x - xi;
    float ty = y - yi;

    int rx0 = xi & 255;
    int rx1 = (rx0 + 1) & 255;
    int ry0 = yi & 255;
    int ry1 = (ry0 + 1) & 255;

    float sx = smootherStep(tx);
    float sy = smootherStep(ty);

    float c00 = m_values[m_permutation[m_permutation[rx0] + ry0]];
    float c10 = m_values[m_permutation[m_permutation[rx1] + ry0]];
    float c01 = m_values[m_permutation[m_permutation[rx0] + ry1]];
    float c11 = m_values[m_permutation[m_permutation[rx1] + ry1]];

    float nx0 = lerp(c00, c10, sx);
    float nx1 = lerp(c01, c11, sx);

    return lerp(nx0, nx1, sy);
}

float ValueNoise::get(float x, float y, float z) const noexcept {
    int xi = static_cast<int>(std::floor(x));
    int yi = static_cast<int>(std::floor(y));
    int zi = static_cast<int>(std::floor(z));

    float tx = x - xi;
    float ty = y - yi;
    float tz = z - zi;

    int rx0 = xi & 255;
    int rx1 = (rx0 + 1) & 255;
    int ry0 = yi & 255;
    int ry1 = (ry0 + 1) & 255;
    int rz0 = zi & 255;
    int rz1 = (rz0 + 1) & 255;

    float sx = smootherStep(tx);
    float sy = smootherStep(ty);
    float sz = smootherStep(tz);

    float c000 = m_values[m_permutation[m_permutation[m_permutation[rx0] + ry0] + rz0]];
    float c100 = m_values[m_permutation[m_permutation[m_permutation[rx1] + ry0] + rz0]];
    float c010 = m_values[m_permutation[m_permutation[m_permutation[rx0] + ry1] + rz0]];
    float c110 = m_values[m_permutation[m_permutation[m_permutation[rx1] + ry1] + rz0]];
    float c001 = m_values[m_permutation[m_permutation[m_permutation[rx0] + ry0] + rz1]];
    float c101 = m_values[m_permutation[m_permutation[m_permutation[rx1] + ry0] + rz1]];
    float c011 = m_values[m_permutation[m_permutation[m_permutation[rx0] + ry1] + rz1]];
    float c111 = m_values[m_permutation[m_permutation[m_permutation[rx1] + ry1] + rz1]];

    float nx00 = lerp(c000, c100, sx);
    float nx10 = lerp(c010, c110, sx);
    float nx01 = lerp(c001, c101, sx);
    float nx11 = lerp(c011, c111, sx);

    float ny0 = lerp(nx00, nx10, sy);
    float ny1 = lerp(nx01, nx11, sy);

    return lerp(ny0, ny1, sz);
}

// Perlin Noise

PerlinNoise::PerlinNoise(uint32_t seed) noexcept {
    Random rng(seed);
    for (int i = 0; i < 256; ++i) {
        m_permutation[i] = static_cast<uint8_t>(i);
    }

    // Shuffle permutation array
    for (int i = 255; i > 0; --i) {
        int j = rng.getInt(0, i);
        std::swap(m_permutation[i], m_permutation[j]);
    }

    // Duplicate to avoid wrapping
    for (int i = 0; i < 256; ++i) {
        m_permutation[256 + i] = m_permutation[i];
    }
}

float PerlinNoise::grad(int hash, float x, float y) const noexcept {
    int h = hash & 15;
    float u = h < 8 ? x : y;
    float v = h < 4 ? y : h == 12 || h == 14 ? x : 0.0f;
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}

float PerlinNoise::grad(int hash, float x, float y, float z) const noexcept {
    int h = hash & 15;
    float u = h < 8 ? x : y;
    float v = h < 4 ? y : h == 12 || h == 14 ? x : z;
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}

float PerlinNoise::get(float x, float y) const noexcept {
    int xi = static_cast<int>(std::floor(x)) & 255;
    int yi = static_cast<int>(std::floor(y)) & 255;

    float xf = x - std::floor(x);
    float yf = y - std::floor(y);

    float u = smootherStep(xf);
    float v = smootherStep(yf);

    int aa = m_permutation[m_permutation[xi] + yi];
    int ab = m_permutation[m_permutation[xi] + yi + 1];
    int ba = m_permutation[m_permutation[xi + 1] + yi];
    int bb = m_permutation[m_permutation[xi + 1] + yi + 1];

    float x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1.0f, yf), u);
    float x2 = lerp(grad(ab, xf, yf - 1.0f), grad(bb, xf - 1.0f, yf - 1.0f), u);

    return lerp(x1, x2, v); // Output between -1 and 1 approx
}

float PerlinNoise::get(float x, float y, float z) const noexcept {
    int xi = static_cast<int>(std::floor(x)) & 255;
    int yi = static_cast<int>(std::floor(y)) & 255;
    int zi = static_cast<int>(std::floor(z)) & 255;

    float xf = x - std::floor(x);
    float yf = y - std::floor(y);
    float zf = z - std::floor(z);

    float u = smootherStep(xf);
    float v = smootherStep(yf);
    float w = smootherStep(zf);

    int a = m_permutation[xi] + yi;
    int aa = m_permutation[a] + zi;
    int ab = m_permutation[a + 1] + zi;
    int b = m_permutation[xi + 1] + yi;
    int ba = m_permutation[b] + zi;
    int bb = m_permutation[b + 1] + zi;

    float x1 = lerp(grad(m_permutation[aa], xf, yf, zf),
                    grad(m_permutation[ba], xf - 1.0f, yf, zf), u);
    float x2 = lerp(grad(m_permutation[ab], xf, yf - 1.0f, zf),
                    grad(m_permutation[bb], xf - 1.0f, yf - 1.0f, zf), u);
    float y1 = lerp(x1, x2, v);

    float x3 = lerp(grad(m_permutation[aa + 1], xf, yf, zf - 1.0f),
                    grad(m_permutation[ba + 1], xf - 1.0f, yf, zf - 1.0f), u);
    float x4 = lerp(grad(m_permutation[ab + 1], xf, yf - 1.0f, zf - 1.0f),
                    grad(m_permutation[bb + 1], xf - 1.0f, yf - 1.0f, zf - 1.0f), u);
    float y2 = lerp(x3, x4, v);

    return lerp(y1, y2, w); // Output between -1 and 1 approx
}

} // namespace DungeonEngine::Math
