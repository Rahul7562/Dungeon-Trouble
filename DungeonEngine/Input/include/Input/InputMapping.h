#pragma once
#include "Input/InputTypes.h"
#include <variant>
#include <vector>
#include <string>
#include <unordered_map>

namespace DungeonEngine::Input {

    using InputActionId = Core::String;
    using InputContextId = Core::String;

    // Represents a logical action
    struct InputAction {
        InputActionId id;
    };

    // Represents a physical hardware event mapped to an action
    struct InputBinding {
        InputActionId actionId;

        // C++17 variant to store the specific physical input requirement
        std::variant<KeyCode, MouseButton, GamepadButton, GamepadAxis> physicalInput;

        // Modifiers that MUST be held for this binding to trigger
        KeyModifier requiredModifiers = KeyModifier::NONE;

        // Threshold for analog axes to count as an action trigger
        Core::f32 axisThreshold = 0.5f;

        bool isKeyboard() const { return std::holds_alternative<KeyCode>(physicalInput); }
        bool isMouse() const { return std::holds_alternative<MouseButton>(physicalInput); }
        bool isGamepadButton() const { return std::holds_alternative<GamepadButton>(physicalInput); }
        bool isGamepadAxis() const { return std::holds_alternative<GamepadAxis>(physicalInput); }

        KeyCode getKeyCode() const { return std::get<KeyCode>(physicalInput); }
        MouseButton getMouseButton() const { return std::get<MouseButton>(physicalInput); }
        GamepadButton getGamepadButton() const { return std::get<GamepadButton>(physicalInput); }
        GamepadAxis getGamepadAxis() const { return std::get<GamepadAxis>(physicalInput); }
    };

    // Groups related bindings
    struct InputContext {
        InputContextId id;
        std::vector<InputBinding> bindings;
    };

}
