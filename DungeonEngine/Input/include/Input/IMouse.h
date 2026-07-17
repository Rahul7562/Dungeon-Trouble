#pragma once
#include "Input/IInputDevice.h"

namespace DungeonEngine::Input {

    class IMouse : public IInputDevice {
    public:
        DeviceType getDeviceType() const override { return DeviceType::MOUSE; }

        virtual bool isButtonPressed(MouseButton button) const = 0;
        virtual bool isButtonReleased(MouseButton button) const = 0;
        virtual bool isButtonHeld(MouseButton button) const = 0;

        virtual Core::f32 getX() const = 0;
        virtual Core::f32 getY() const = 0;
        virtual Core::f32 getDeltaX() const = 0;
        virtual Core::f32 getDeltaY() const = 0;

        virtual Core::f32 getScrollDeltaX() const = 0;
        virtual Core::f32 getScrollDeltaY() const = 0;

        virtual void setCursorVisible(bool visible) = 0;
        virtual bool isCursorVisible() const = 0;
        virtual void setCursorLocked(bool locked) = 0;
        virtual bool isCursorLocked() const = 0;
    };

}
