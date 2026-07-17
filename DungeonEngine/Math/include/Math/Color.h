#pragma once

#include "MathUtils.h"
#include <cstdint>

namespace DungeonEngine::Math {

struct Color {
    float r;
    float g;
    float b;
    float a;

    constexpr Color() noexcept : r(0.0f), g(0.0f), b(0.0f), a(1.0f) {}
    constexpr Color(float r, float g, float b, float a = 1.0f) noexcept : r(r), g(g), b(b), a(a) {}

    // Convert from standard sRGB 0-255 to Linear 0.0-1.0
    static Color fromRGB8(uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255) noexcept {
        return Color(r / 255.0f, g / 255.0f, b / 255.0f, a / 255.0f);
    }

    // Convert from Hex (e.g., 0xFF0000FF for Red)
    static Color fromHex(uint32_t hex) noexcept {
        return fromRGB8(
            (hex >> 24) & 0xFF,
            (hex >> 16) & 0xFF,
            (hex >> 8) & 0xFF,
            hex & 0xFF
        );
    }

    // HSV to RGB (h: 0-360, s: 0-1, v: 0-1)
    static Color fromHSV(float h, float s, float v, float a = 1.0f) noexcept;

    // Linear to sRGB gamma correction
    Color toSRGB() const noexcept {
        auto linearToSRGB = [](float channel) -> float {
            if (channel <= 0.0031308f) {
                return channel * 12.92f;
            } else {
                return 1.055f * std::pow(channel, 1.0f / 2.4f) - 0.055f;
            }
        };
        return Color(linearToSRGB(r), linearToSRGB(g), linearToSRGB(b), a);
    }

    // sRGB to Linear
    Color toLinear() const noexcept {
        auto sRGBToLinear = [](float channel) -> float {
            if (channel <= 0.04045f) {
                return channel / 12.92f;
            } else {
                return std::pow((channel + 0.055f) / 1.055f, 2.4f);
            }
        };
        return Color(sRGBToLinear(r), sRGBToLinear(g), sRGBToLinear(b), a);
    }

    uint32_t toHex() const noexcept {
        uint8_t r8 = static_cast<uint8_t>(clamp(r, 0.0f, 1.0f) * 255.0f);
        uint8_t g8 = static_cast<uint8_t>(clamp(g, 0.0f, 1.0f) * 255.0f);
        uint8_t b8 = static_cast<uint8_t>(clamp(b, 0.0f, 1.0f) * 255.0f);
        uint8_t a8 = static_cast<uint8_t>(clamp(a, 0.0f, 1.0f) * 255.0f);

        return (r8 << 24) | (g8 << 16) | (b8 << 8) | a8;
    }

    // Arithmetic
    constexpr Color operator*(float scalar) const noexcept {
        return Color(r * scalar, g * scalar, b * scalar, a * scalar);
    }

    constexpr Color operator*(const Color& rhs) const noexcept {
        return Color(r * rhs.r, g * rhs.g, b * rhs.b, a * rhs.a);
    }

    constexpr Color operator+(const Color& rhs) const noexcept {
        return Color(r + rhs.r, g + rhs.g, b + rhs.b, a + rhs.a);
    }

    // Colors
    static constexpr Color white() noexcept { return Color(1.0f, 1.0f, 1.0f, 1.0f); }
    static constexpr Color black() noexcept { return Color(0.0f, 0.0f, 0.0f, 1.0f); }
    static constexpr Color red() noexcept { return Color(1.0f, 0.0f, 0.0f, 1.0f); }
    static constexpr Color green() noexcept { return Color(0.0f, 1.0f, 0.0f, 1.0f); }
    static constexpr Color blue() noexcept { return Color(0.0f, 0.0f, 1.0f, 1.0f); }
    static constexpr Color clear() noexcept { return Color(0.0f, 0.0f, 0.0f, 0.0f); }
};

} // namespace DungeonEngine::Math
