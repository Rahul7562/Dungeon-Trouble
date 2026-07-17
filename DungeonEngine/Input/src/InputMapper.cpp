#include "Input/InputMapper.h"
#include "Input/IKeyboard.h"
#include "Input/IMouse.h"
#include "Input/IGamepad.h"
#include <algorithm>

namespace DungeonEngine::Input {

    InputMapper::InputMapper(std::shared_ptr<IInputManager> inputManager)
        : m_inputManager(std::move(inputManager)) {
    }

    void InputMapper::registerContext(const InputContext& context) {
        m_contexts[context.id] = context;
    }

    void InputMapper::pushContext(const InputContextId& contextId) {
        if (m_contexts.find(contextId) != m_contexts.end()) {
            m_activeContextStack.push_back(contextId);
        }
    }

    void InputMapper::popContext() {
        if (!m_activeContextStack.empty()) {
            m_activeContextStack.pop_back();
        }
    }

    void InputMapper::clearContexts() {
        m_activeContextStack.clear();
    }

    void InputMapper::addBinding(const InputContextId& contextId, const InputBinding& binding) {
        m_contexts[contextId].bindings.push_back(binding);
    }

    void InputMapper::removeBinding(const InputContextId& contextId, const InputActionId& actionId) {
        auto it = m_contexts.find(contextId);
        if (it != m_contexts.end()) {
            auto& bindings = it->second.bindings;
            bindings.erase(
                std::remove_if(bindings.begin(), bindings.end(), [&](const InputBinding& b) {
                    return b.actionId == actionId;
                }),
                bindings.end()
            );
        }
    }

    void InputMapper::clearBindings(const InputContextId& contextId) {
        auto it = m_contexts.find(contextId);
        if (it != m_contexts.end()) {
            it->second.bindings.clear();
        }
    }

    bool InputMapper::evaluateBindingState(const InputBinding& binding, InputState targetState) const {
        if (!m_inputManager) return false;

        if (binding.isKeyboard()) {
            auto kb = m_inputManager->getDevice<IKeyboard>(DeviceType::KEYBOARD);
            if (kb) {
                // Check modifiers
                if (binding.requiredModifiers != KeyModifier::NONE) {
                    if ((kb->getModifiers() & binding.requiredModifiers) != true) {
                        return false;
                    }
                }

                KeyCode key = binding.getKeyCode();
                switch (targetState) {
                    case InputState::PRESSED: return kb->isKeyPressed(key);
                    case InputState::RELEASED: return kb->isKeyReleased(key);
                    case InputState::HELD: return kb->isKeyHeld(key);
                    default: return false;
                }
            }
        } else if (binding.isMouse()) {
            auto mouse = m_inputManager->getDevice<IMouse>(DeviceType::MOUSE);
            if (mouse) {
                MouseButton button = binding.getMouseButton();
                switch (targetState) {
                    case InputState::PRESSED: return mouse->isButtonPressed(button);
                    case InputState::RELEASED: return mouse->isButtonReleased(button);
                    case InputState::HELD: return mouse->isButtonHeld(button);
                    default: return false;
                }
            }
        } else if (binding.isGamepadButton()) {
            auto gamepad = m_inputManager->getDevice<IGamepad>(DeviceType::GAMEPAD);
            if (gamepad) {
                GamepadButton button = binding.getGamepadButton();
                switch (targetState) {
                    case InputState::PRESSED: return gamepad->isButtonPressed(button);
                    case InputState::RELEASED: return gamepad->isButtonReleased(button);
                    case InputState::HELD: return gamepad->isButtonHeld(button);
                    default: return false;
                }
            }
        } else if (binding.isGamepadAxis()) {
            // Axes evaluate based on whether their value crosses the threshold
            auto gamepad = m_inputManager->getDevice<IGamepad>(DeviceType::GAMEPAD);
            if (gamepad) {
                GamepadAxis axis = binding.getGamepadAxis();
                Core::f32 val = gamepad->getAxisValue(axis);
                bool isActive = std::abs(val) >= binding.axisThreshold;

                // For PRESSED/RELEASED on an axis, we'd theoretically need to track the axis state over frames.
                // For simplicity in this milestone, axis is just treated as HELD if above threshold.
                // To do true PRESSED on axis, InputManager needs axis-history tracking which complicates the design for a minor feature.
                if (targetState == InputState::HELD) {
                    return isActive;
                }
            }
        }

        return false;
    }

    bool InputMapper::isActionPressed(const InputActionId& actionId) const {
        // Evaluate from top of stack downwards
        for (auto it = m_activeContextStack.rbegin(); it != m_activeContextStack.rend(); ++it) {
            const auto& ctxIt = m_contexts.find(*it);
            if (ctxIt != m_contexts.end()) {
                const auto& context = ctxIt->second;
                for (const auto& binding : context.bindings) {
                    if (binding.actionId == actionId) {
                        if (evaluateBindingState(binding, InputState::PRESSED)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    bool InputMapper::isActionReleased(const InputActionId& actionId) const {
        for (auto it = m_activeContextStack.rbegin(); it != m_activeContextStack.rend(); ++it) {
            const auto& ctxIt = m_contexts.find(*it);
            if (ctxIt != m_contexts.end()) {
                const auto& context = ctxIt->second;
                for (const auto& binding : context.bindings) {
                    if (binding.actionId == actionId) {
                        if (evaluateBindingState(binding, InputState::RELEASED)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    bool InputMapper::isActionHeld(const InputActionId& actionId) const {
        for (auto it = m_activeContextStack.rbegin(); it != m_activeContextStack.rend(); ++it) {
            const auto& ctxIt = m_contexts.find(*it);
            if (ctxIt != m_contexts.end()) {
                const auto& context = ctxIt->second;
                for (const auto& binding : context.bindings) {
                    if (binding.actionId == actionId) {
                        if (evaluateBindingState(binding, InputState::HELD)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    Core::f32 InputMapper::getActionValue(const InputActionId& actionId) const {
        Core::f32 highestVal = 0.0f;

        for (auto it = m_activeContextStack.rbegin(); it != m_activeContextStack.rend(); ++it) {
            const auto& ctxIt = m_contexts.find(*it);
            if (ctxIt != m_contexts.end()) {
                const auto& context = ctxIt->second;
                for (const auto& binding : context.bindings) {
                    if (binding.actionId == actionId) {
                        if (binding.isGamepadAxis()) {
                            auto gamepad = m_inputManager->getDevice<IGamepad>(DeviceType::GAMEPAD);
                            if (gamepad) {
                                Core::f32 val = gamepad->getAxisValue(binding.getGamepadAxis());
                                if (std::abs(val) > std::abs(highestVal)) {
                                    highestVal = val;
                                }
                            }
                        } else {
                            // Non-axes return 1.0f if held
                            if (evaluateBindingState(binding, InputState::HELD)) {
                                return 1.0f;
                            }
                        }
                    }
                }
            }
        }
        return highestVal;
    }

}
