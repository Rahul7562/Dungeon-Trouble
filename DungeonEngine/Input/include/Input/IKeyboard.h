#pragma once
#include "Input/IInputDevice.h"

namespace DungeonEngine::Input {

    class IKeyboard : public IInputDevice {
    public:
        DeviceType getDeviceType() const override { return DeviceType::KEYBOARD; }

        virtual bool isKeyPressed(KeyCode key) const = 0;
        virtual bool isKeyReleased(KeyCode key) const = 0;
        virtual bool isKeyHeld(KeyCode key) const = 0;

        virtual bool isKeyPressed(ScanCode scancode) const = 0;
        virtual bool isKeyReleased(ScanCode scancode) const = 0;
        virtual bool isKeyHeld(ScanCode scancode) const = 0;

        virtual bool hasModifier(KeyModifier modifier) const = 0;
        virtual KeyModifier getModifiers() const = 0;
    };

}
