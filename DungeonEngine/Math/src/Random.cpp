#include "Math/Random.h"
#include <cmath>

namespace DungeonEngine::Math {

Random::Random() noexcept : state(0x853c49e6748fea9bULL), inc(0xda3e39cb94b95bdbULL) {
    // Default seed
}

Random::Random(uint64_t seed) noexcept : state(0U), inc(0xda3e39cb94b95bdbULL) {
    this->seed(seed);
}

void Random::seed(uint64_t seed) noexcept {
    state = 0U;
    inc = (seed << 1u) | 1u;
    next();
    state += seed;
    next();
}

uint32_t Random::next() noexcept {
    uint64_t oldstate = state;
    // Advance internal state
    state = oldstate * 6364136223846793005ULL + (inc | 1);
    // Calculate output function (XSH RR), uses old state for max ILP
    uint32_t xorshifted = static_cast<uint32_t>(((oldstate >> 18u) ^ oldstate) >> 27u);
    uint32_t rot = static_cast<uint32_t>(oldstate >> 59u);
    return (xorshifted >> rot) | (xorshifted << ((~rot + 1u) & 31u));
}

float Random::getFloat() noexcept {
    // 24 bits of precision for float
    return (next() >> 8) * (1.0f / 16777216.0f);
}

float Random::getFloat(float min, float max) noexcept {
    return min + getFloat() * (max - min);
}

int Random::getInt(int min, int max) noexcept {
    uint32_t range = static_cast<uint32_t>(max - min + 1);
    // Unbiased modulo approach (Lemire's method)
    uint32_t x = next();
    uint64_t m = static_cast<uint64_t>(x) * static_cast<uint64_t>(range);
    uint32_t l = static_cast<uint32_t>(m);
    if (l < range) {
        uint32_t t = -range;
        if (t >= range) {
            t -= range;
            if (t >= range) t %= range;
        }
        while (l < t) {
            x = next();
            m = static_cast<uint64_t>(x) * static_cast<uint64_t>(range);
            l = static_cast<uint32_t>(m);
        }
    }
    return min + static_cast<int>(m >> 32);
}

bool Random::getBool() noexcept {
    return (next() & 1) == 1;
}

Vector2 Random::getVector2InCircle() noexcept {
    float angle = getFloat(0.0f, TAU);
    float r = std::sqrt(getFloat());
    return Vector2(r * std::cos(angle), r * std::sin(angle));
}

Vector2 Random::getUnitVector2() noexcept {
    float angle = getFloat(0.0f, TAU);
    return Vector2(std::cos(angle), std::sin(angle));
}

Vector3 Random::getUnitVector3() noexcept {
    float z = getFloat(-1.0f, 1.0f);
    float a = getFloat(0.0f, TAU);
    float r = std::sqrt(1.0f - z * z);
    return Vector3(r * std::cos(a), r * std::sin(a), z);
}

Vector3 Random::getVector3InSphere() noexcept {
    float u = getFloat();
    float v = getFloat();
    float theta = u * TAU;
    float phi = std::acos(2.0f * v - 1.0f);
    float r = std::cbrt(getFloat());
    float sinPhi = std::sin(phi);
    return Vector3(
        r * sinPhi * std::cos(theta),
        r * sinPhi * std::sin(theta),
        r * std::cos(phi)
    );
}

Color Random::getColor() noexcept {
    return Color(getFloat(), getFloat(), getFloat(), 1.0f);
}

} // namespace DungeonEngine::Math
