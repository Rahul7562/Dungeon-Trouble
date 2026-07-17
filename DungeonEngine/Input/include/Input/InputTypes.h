#pragma once

#include "Core/Types.h"
#include <string>

namespace DungeonEngine::Input {

    enum class DeviceType : Core::u8 {
        UNKNOWN = 0,
        KEYBOARD,
        MOUSE,
        GAMEPAD,
        TOUCH,      // Future-ready
        VR_CONTROLLER // Future-ready
    };

    enum class InputState : Core::u8 {
        NONE = 0,
        PRESSED,
        HELD,
        RELEASED
    };

    // Forward declarations of our specific code types
    // Using standard mapping for keys, commonly aligned with standard OS/GLFW/SDL mapping
    enum class KeyCode : Core::u16 {
        UNKNOWN = 0,
        SPACE = 32,
        APOSTROPHE = 39,
        COMMA = 44,
        MINUS = 45,
        PERIOD = 46,
        SLASH = 47,
        NUM_0 = 48, NUM_1 = 49, NUM_2 = 50, NUM_3 = 51, NUM_4 = 52,
        NUM_5 = 53, NUM_6 = 54, NUM_7 = 55, NUM_8 = 56, NUM_9 = 57,
        SEMICOLON = 59,
        EQUAL = 61,
        A = 65, B = 66, C = 67, D = 68, E = 69, F = 70, G = 71, H = 72, I = 73,
        J = 74, K = 75, L = 76, M = 77, N = 78, O = 79, P = 80, Q = 81, R = 82,
        S = 83, T = 84, U = 85, V = 86, W = 87, X = 88, Y = 89, Z = 90,
        LEFT_BRACKET = 91,
        BACKSLASH = 92,
        RIGHT_BRACKET = 93,
        GRAVE_ACCENT = 96,
        ESCAPE = 256,
        ENTER = 257,
        TAB = 258,
        BACKSPACE = 259,
        INSERT = 260,
        DELETE_KEY = 261,
        RIGHT = 262,
        LEFT = 263,
        DOWN = 264,
        UP = 265,
        PAGE_UP = 266,
        PAGE_DOWN = 267,
        HOME = 268,
        END = 269,
        CAPS_LOCK = 280,
        SCROLL_LOCK = 281,
        NUM_LOCK = 282,
        PRINT_SCREEN = 283,
        PAUSE = 284,
        F1 = 290, F2 = 291, F3 = 292, F4 = 293, F5 = 294, F6 = 295,
        F7 = 296, F8 = 297, F9 = 298, F10 = 299, F11 = 300, F12 = 301,
        KP_0 = 320, KP_1 = 321, KP_2 = 322, KP_3 = 323, KP_4 = 324,
        KP_5 = 325, KP_6 = 326, KP_7 = 327, KP_8 = 328, KP_9 = 329,
        KP_DECIMAL = 330,
        KP_DIVIDE = 331,
        KP_MULTIPLY = 332,
        KP_SUBTRACT = 333,
        KP_ADD = 334,
        KP_ENTER = 335,
        KP_EQUAL = 336,
        LEFT_SHIFT = 340,
        LEFT_CONTROL = 341,
        LEFT_ALT = 342,
        LEFT_SUPER = 343,
        RIGHT_SHIFT = 344,
        RIGHT_CONTROL = 345,
        RIGHT_ALT = 346,
        RIGHT_SUPER = 347,
        MENU = 348
    };

    // Hardware dependent scancode (optional abstraction for unmapped keys)
    using ScanCode = Core::u32;

    enum class KeyModifier : Core::u8 {
        NONE = 0,
        SHIFT = 1 << 0,
        CONTROL = 1 << 1,
        ALT = 1 << 2,
        SUPER = 1 << 3,
        CAPS_LOCK = 1 << 4,
        NUM_LOCK = 1 << 5
    };

    inline KeyModifier operator|(KeyModifier a, KeyModifier b) {
        return static_cast<KeyModifier>(static_cast<Core::u8>(a) | static_cast<Core::u8>(b));
    }

    inline bool operator&(KeyModifier a, KeyModifier b) {
        return (static_cast<Core::u8>(a) & static_cast<Core::u8>(b)) != 0;
    }

    enum class MouseButton : Core::u8 {
        LEFT = 0,
        RIGHT = 1,
        MIDDLE = 2,
        BUTTON_4 = 3,
        BUTTON_5 = 4,
        BUTTON_6 = 5,
        BUTTON_7 = 6,
        BUTTON_8 = 7
    };

    enum class GamepadButton : Core::u8 {
        A = 0, // Cross on PS
        B = 1, // Circle
        X = 2, // Square
        Y = 3, // Triangle
        LEFT_BUMPER = 4,
        RIGHT_BUMPER = 5,
        BACK = 6,   // Select / Share
        START = 7,  // Options
        GUIDE = 8,  // PS / Xbox button
        LEFT_THUMB = 9,
        RIGHT_THUMB = 10,
        DPAD_UP = 11,
        DPAD_RIGHT = 12,
        DPAD_DOWN = 13,
        DPAD_LEFT = 14
    };

    enum class GamepadAxis : Core::u8 {
        LEFT_X = 0,
        LEFT_Y = 1,
        RIGHT_X = 2,
        RIGHT_Y = 3,
        LEFT_TRIGGER = 4,
        RIGHT_TRIGGER = 5
    };

}
