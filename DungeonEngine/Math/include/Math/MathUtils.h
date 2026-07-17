#pragma once

#include <cmath>
#include <limits>
#include <algorithm>
#include <type_traits>
#include "Core/Assert.h"

namespace DungeonEngine::Math {

// Math Constants
constexpr float PI = 3.14159265358979323846f;
constexpr float PI_2 = 1.57079632679489661923f;
constexpr float PI_4 = 0.78539816339744830962f;
constexpr float PI_INV = 0.31830988618379067154f;
constexpr float TAU = 6.28318530717958647692f;
constexpr float EPSILON = std::numeric_limits<float>::epsilon();
constexpr float DEG_TO_RAD = PI / 180.0f;
constexpr float RAD_TO_DEG = 180.0f / PI;

// Compile-time Absolute
template <typename T>
constexpr T abs(T value) noexcept {
    return value < 0 ? -value : value;
}

// Compile-time Min
template <typename T>
constexpr T min(T a, T b) noexcept {
    return a < b ? a : b;
}

// Compile-time Max
template <typename T>
constexpr T max(T a, T b) noexcept {
    return a > b ? a : b;
}

// Clamp
template <typename T>
constexpr T clamp(T value, T minVal, T maxVal) noexcept {
    DT_ASSERT(minVal <= maxVal, "Clamp min must be less than or equal to max");
    return value < minVal ? minVal : (value > maxVal ? maxVal : value);
}

// Saturate
template <typename T>
constexpr T saturate(T value) noexcept {
    return clamp(value, static_cast<T>(0), static_cast<T>(1));
}

// Sign
template <typename T>
constexpr int sign(T value) noexcept {
    return (static_cast<T>(0) < value) - (value < static_cast<T>(0));
}

// Degrees to Radians
template <typename T>
constexpr T toRadians(T degrees) noexcept {
    return degrees * static_cast<T>(DEG_TO_RAD);
}

// Radians to Degrees
template <typename T>
constexpr T toDegrees(T radians) noexcept {
    return radians * static_cast<T>(RAD_TO_DEG);
}

// Floating-point Epsilon Comparison
inline bool nearlyEqual(float a, float b, float epsilon = EPSILON) noexcept {
    const float diff = std::abs(a - b);
    return diff <= epsilon || diff < max(std::abs(a), std::abs(b)) * epsilon;
}

// Wrap a value between min and max (inclusive of min, exclusive of max)
template <typename T>
inline T wrap(T value, T minVal, T maxVal) noexcept {
    DT_ASSERT(minVal < maxVal, "Wrap min must be strictly less than max");
    T range = maxVal - minVal;
    if (range == static_cast<T>(0)) {
        return minVal;
    }
    T result = std::fmod(value - minVal, range);
    if (result < static_cast<T>(0)) {
        result += range;
    }
    return result + minVal;
}

template <>
inline int wrap<int>(int value, int minVal, int maxVal) noexcept {
    DT_ASSERT(minVal < maxVal, "Wrap min must be strictly less than max");
    int range = maxVal - minVal;
    if (range == 0) return minVal;
    int result = (value - minVal) % range;
    if (result < 0) result += range;
    return result + minVal;
}

// PingPong (oscillates between 0 and length)
template <typename T>
inline T pingPong(T value, T length) noexcept {
    DT_ASSERT(length > static_cast<T>(0), "PingPong length must be greater than zero");
    T t = wrap(value, static_cast<T>(0), length * static_cast<T>(2));
    return length - std::abs(t - length);
}

} // namespace DungeonEngine::Math
