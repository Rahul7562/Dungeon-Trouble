#pragma once

#include "MathUtils.h"

namespace DungeonEngine::Math {

// Linear Interpolation
template <typename T>
constexpr T lerp(const T& a, const T& b, float t) noexcept {
    return a + (b - a) * t;
}

// Inverse Lerp (returns t given a, b, and a value)
template <typename T>
constexpr float inverseLerp(const T& a, const T& b, const T& value) noexcept {
    if (a != b) {
        return saturate((value - a) / static_cast<float>(b - a));
    }
    return 0.0f;
}

// Remap a value from one range to another
template <typename T>
constexpr T remap(const T& value, const T& inMin, const T& inMax, const T& outMin, const T& outMax) noexcept {
    float t = inverseLerp(inMin, inMax, value);
    return lerp(outMin, outMax, t);
}

// SmoothStep (Hermite interpolation between 0 and 1)
constexpr float smoothStep(float t) noexcept {
    float x = saturate(t);
    return x * x * (3.0f - 2.0f * x);
}

// SmootherStep (Ken Perlin's alternative to smoothstep)
constexpr float smootherStep(float t) noexcept {
    float x = saturate(t);
    return x * x * x * (x * (x * 6.0f - 15.0f) + 10.0f);
}

// Cubic Interpolation
template <typename T>
constexpr T cubicInterp(const T& p0, const T& p1, const T& p2, const T& p3, float t) noexcept {
    float t2 = t * t;
    float t3 = t2 * t;

    T a = p3 - p2 - p0 + p1;
    T b = p0 - p1 - a;
    T c = p2 - p0;
    T d = p1;

    return a * t3 + b * t2 + c * t + d;
}

// Catmull-Rom Spline Interpolation
template <typename T>
constexpr T catmullRom(const T& p0, const T& p1, const T& p2, const T& p3, float t) noexcept {
    float t2 = t * t;
    float t3 = t2 * t;

    return ((p1 * 2.0f) +
            (p2 - p0) * t +
            ((p0 * 2.0f) - (p1 * 5.0f) + (p2 * 4.0f) - p3) * t2 +
            ((p0 * -1.0f) + (p1 * 3.0f) - (p2 * 3.0f) + p3) * t3) * 0.5f;
}

// Quadratic Bezier Interpolation
template <typename T>
constexpr T bezier(const T& p0, const T& p1, const T& p2, float t) noexcept {
    float u = 1.0f - t;
    float tt = t * t;
    float uu = u * u;

    T p = (p0 * uu) + (p1 * 2.0f * u * t) + (p2 * tt);
    return p;
}

// Cubic Bezier Interpolation
template <typename T>
constexpr T bezier(const T& p0, const T& p1, const T& p2, const T& p3, float t) noexcept {
    float u = 1.0f - t;
    float tt = t * t;
    float uu = u * u;
    float uuu = uu * u;
    float ttt = tt * t;

    T p = (p0 * uuu) + (p1 * 3.0f * uu * t) + (p2 * 3.0f * u * tt) + (p3 * ttt);
    return p;
}

// Hermite Interpolation
template <typename T>
constexpr T hermite(const T& p0, const T& t0, const T& p1, const T& t1, float t) noexcept {
    float t2 = t * t;
    float t3 = t2 * t;

    float h1 = 2.0f * t3 - 3.0f * t2 + 1.0f;
    float h2 = -2.0f * t3 + 3.0f * t2;
    float h3 = t3 - 2.0f * t2 + t;
    float h4 = t3 - t2;

    return (p0 * h1) + (p1 * h2) + (t0 * h3) + (t1 * h4);
}

} // namespace DungeonEngine::Math
