#pragma once
#include "Input/IKeyboard.h"
#include "Input/IMouse.h"
#include "Input/IGamepad.h"
#include <unordered_map>
#include <string>

namespace DungeonEngine::Input {

    class SimulatedKeyboard : public IKeyboard {
    public:
        SimulatedKeyboard(Core::String name = "SimulatedKeyboard") : m_name(std::move(name)) {}

        void update() override;
        bool isConnected() const override { return true; }
        const Core::String& getName() const override { return m_name; }

        bool isKeyPressed(KeyCode key) const override;
        bool isKeyReleased(KeyCode key) const override;
        bool isKeyHeld(KeyCode key) const override;

        bool isKeyPressed(ScanCode scancode) const override { (void)scancode; return false; } // Stub
        bool isKeyReleased(ScanCode scancode) const override { (void)scancode; return false; } // Stub
        bool isKeyHeld(ScanCode scancode) const override { (void)scancode; return false; } // Stub

        bool hasModifier(KeyModifier modifier) const override;
        KeyModifier getModifiers() const override;

        // Simulation methods
        void simulateKeyDown(KeyCode key);
        void simulateKeyUp(KeyCode key);
        void setModifiers(KeyModifier mods) { m_modifiers = mods; }

    private:
        Core::String m_name;
        std::unordered_map<KeyCode, bool> m_currentFrameKeys;
        std::unordered_map<KeyCode, bool> m_previousFrameKeys;
        KeyModifier m_modifiers = KeyModifier::NONE;
    };

    class SimulatedMouse : public IMouse {
    public:
        SimulatedMouse(Core::String name = "SimulatedMouse") : m_name(std::move(name)) {}

        void update() override;
        bool isConnected() const override { return true; }
        const Core::String& getName() const override { return m_name; }

        bool isButtonPressed(MouseButton button) const override;
        bool isButtonReleased(MouseButton button) const override;
        bool isButtonHeld(MouseButton button) const override;

        Core::f32 getX() const override { return m_x; }
        Core::f32 getY() const override { return m_y; }
        Core::f32 getDeltaX() const override { return m_deltaX; }
        Core::f32 getDeltaY() const override { return m_deltaY; }

        Core::f32 getScrollDeltaX() const override { return m_scrollDeltaX; }
        Core::f32 getScrollDeltaY() const override { return m_scrollDeltaY; }

        void setCursorVisible(bool visible) override { m_visible = visible; }
        bool isCursorVisible() const override { return m_visible; }
        void setCursorLocked(bool locked) override { m_locked = locked; }
        bool isCursorLocked() const override { return m_locked; }

        // Simulation methods
        void simulateButtonDown(MouseButton button);
        void simulateButtonUp(MouseButton button);
        void simulateMouseMove(Core::f32 x, Core::f32 y);
        void simulateScroll(Core::f32 dx, Core::f32 dy);

    private:
        Core::String m_name;
        std::unordered_map<MouseButton, bool> m_currentFrameButtons;
        std::unordered_map<MouseButton, bool> m_previousFrameButtons;
        Core::f32 m_x = 0.0f, m_y = 0.0f;
        Core::f32 m_deltaX = 0.0f, m_deltaY = 0.0f;
        Core::f32 m_scrollDeltaX = 0.0f, m_scrollDeltaY = 0.0f;

        // These accumulated values simulate what OS events would build up over a frame
        Core::f32 m_accumDeltaX = 0.0f, m_accumDeltaY = 0.0f;
        Core::f32 m_accumScrollX = 0.0f, m_accumScrollY = 0.0f;

        bool m_visible = true;
        bool m_locked = false;
    };

    class SimulatedGamepad : public IGamepad {
    public:
        SimulatedGamepad(Core::String name = "SimulatedGamepad") : m_name(std::move(name)) {}

        void update() override;
        bool isConnected() const override { return m_connected; }
        const Core::String& getName() const override { return m_name; }

        bool isButtonPressed(GamepadButton button) const override;
        bool isButtonReleased(GamepadButton button) const override;
        bool isButtonHeld(GamepadButton button) const override;

        Core::f32 getAxisValue(GamepadAxis axis) const override;
        void setDeadZone(GamepadAxis axis, Core::f32 deadZone) override;
        Core::f32 getDeadZone(GamepadAxis axis) const override;

        void setVibration(Core::f32 leftMotor, Core::f32 rightMotor) override;

        // Simulation methods
        void setConnected(bool connected) { m_connected = connected; }
        void simulateButtonDown(GamepadButton button);
        void simulateButtonUp(GamepadButton button);
        void simulateAxisMove(GamepadAxis axis, Core::f32 value);

        Core::f32 getLeftVibration() const { return m_leftVibration; }
        Core::f32 getRightVibration() const { return m_rightVibration; }

    private:
        Core::String m_name;
        bool m_connected = true;
        std::unordered_map<GamepadButton, bool> m_currentFrameButtons;
        std::unordered_map<GamepadButton, bool> m_previousFrameButtons;
        std::unordered_map<GamepadAxis, Core::f32> m_axes;
        std::unordered_map<GamepadAxis, Core::f32> m_deadZones;

        Core::f32 m_leftVibration = 0.0f;
        Core::f32 m_rightVibration = 0.0f;
    };

}
