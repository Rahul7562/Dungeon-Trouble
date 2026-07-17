#include "SimulatedDevices.h"
#include <cmath>

namespace DungeonEngine::Input {

    // --- SimulatedKeyboard ---
    void SimulatedKeyboard::update() {
        m_previousFrameKeys = m_currentFrameKeys;
    }

    bool SimulatedKeyboard::isKeyPressed(KeyCode key) const {
        bool current = false;
        if (auto it = m_currentFrameKeys.find(key); it != m_currentFrameKeys.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameKeys.find(key); it != m_previousFrameKeys.end()) previous = it->second;

        return current && !previous;
    }

    bool SimulatedKeyboard::isKeyReleased(KeyCode key) const {
        bool current = false;
        if (auto it = m_currentFrameKeys.find(key); it != m_currentFrameKeys.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameKeys.find(key); it != m_previousFrameKeys.end()) previous = it->second;

        return !current && previous;
    }

    bool SimulatedKeyboard::isKeyHeld(KeyCode key) const {
        if (auto it = m_currentFrameKeys.find(key); it != m_currentFrameKeys.end()) return it->second;
        return false;
    }

    bool SimulatedKeyboard::hasModifier(KeyModifier modifier) const {
        return m_modifiers & modifier;
    }

    KeyModifier SimulatedKeyboard::getModifiers() const {
        return m_modifiers;
    }

    void SimulatedKeyboard::simulateKeyDown(KeyCode key) {
        m_currentFrameKeys[key] = true;
    }

    void SimulatedKeyboard::simulateKeyUp(KeyCode key) {
        m_currentFrameKeys[key] = false;
    }


    // --- SimulatedMouse ---
    void SimulatedMouse::update() {
        m_previousFrameButtons = m_currentFrameButtons;

        // Transfer accumulated deltas to frame deltas
        m_deltaX = m_accumDeltaX;
        m_deltaY = m_accumDeltaY;
        m_scrollDeltaX = m_accumScrollX;
        m_scrollDeltaY = m_accumScrollY;

        // Reset accumulators for the next frame
        m_accumDeltaX = 0.0f;
        m_accumDeltaY = 0.0f;
        m_accumScrollX = 0.0f;
        m_accumScrollY = 0.0f;
    }

    bool SimulatedMouse::isButtonPressed(MouseButton button) const {
        bool current = false;
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameButtons.find(button); it != m_previousFrameButtons.end()) previous = it->second;

        return current && !previous;
    }

    bool SimulatedMouse::isButtonReleased(MouseButton button) const {
        bool current = false;
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameButtons.find(button); it != m_previousFrameButtons.end()) previous = it->second;

        return !current && previous;
    }

    bool SimulatedMouse::isButtonHeld(MouseButton button) const {
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) return it->second;
        return false;
    }

    void SimulatedMouse::simulateButtonDown(MouseButton button) {
        m_currentFrameButtons[button] = true;
    }

    void SimulatedMouse::simulateButtonUp(MouseButton button) {
        m_currentFrameButtons[button] = false;
    }

    void SimulatedMouse::simulateMouseMove(Core::f32 x, Core::f32 y) {
        m_accumDeltaX += (x - m_x);
        m_accumDeltaY += (y - m_y);
        m_x = x;
        m_y = y;
    }

    void SimulatedMouse::simulateScroll(Core::f32 dx, Core::f32 dy) {
        m_accumScrollX += dx;
        m_accumScrollY += dy;
    }


    // --- SimulatedGamepad ---
    void SimulatedGamepad::update() {
        m_previousFrameButtons = m_currentFrameButtons;
    }

    bool SimulatedGamepad::isButtonPressed(GamepadButton button) const {
        bool current = false;
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameButtons.find(button); it != m_previousFrameButtons.end()) previous = it->second;

        return current && !previous;
    }

    bool SimulatedGamepad::isButtonReleased(GamepadButton button) const {
        bool current = false;
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) current = it->second;

        bool previous = false;
        if (auto it = m_previousFrameButtons.find(button); it != m_previousFrameButtons.end()) previous = it->second;

        return !current && previous;
    }

    bool SimulatedGamepad::isButtonHeld(GamepadButton button) const {
        if (auto it = m_currentFrameButtons.find(button); it != m_currentFrameButtons.end()) return it->second;
        return false;
    }

    Core::f32 SimulatedGamepad::getAxisValue(GamepadAxis axis) const {
        Core::f32 val = 0.0f;
        if (auto it = m_axes.find(axis); it != m_axes.end()) {
            val = it->second;
        }

        Core::f32 deadzone = getDeadZone(axis);
        if (std::abs(val) < deadzone) {
            return 0.0f;
        }

        // Remap value to account for deadzone so it scales 0.0 -> 1.0 properly from the deadzone edge
        if (val > 0.0f) {
            return (val - deadzone) / (1.0f - deadzone);
        } else {
            return (val + deadzone) / (1.0f - deadzone);
        }
    }

    void SimulatedGamepad::setDeadZone(GamepadAxis axis, Core::f32 deadZone) {
        m_deadZones[axis] = deadZone;
    }

    Core::f32 SimulatedGamepad::getDeadZone(GamepadAxis axis) const {
        if (auto it = m_deadZones.find(axis); it != m_deadZones.end()) return it->second;
        return 0.1f; // Default deadzone
    }

    void SimulatedGamepad::setVibration(Core::f32 leftMotor, Core::f32 rightMotor) {
        m_leftVibration = leftMotor;
        m_rightVibration = rightMotor;
    }

    void SimulatedGamepad::simulateButtonDown(GamepadButton button) {
        m_currentFrameButtons[button] = true;
    }

    void SimulatedGamepad::simulateButtonUp(GamepadButton button) {
        m_currentFrameButtons[button] = false;
    }

    void SimulatedGamepad::simulateAxisMove(GamepadAxis axis, Core::f32 value) {
        m_axes[axis] = value;
    }

}
