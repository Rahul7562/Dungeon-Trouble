#pragma once
#include "Input/IInputDevice.h"

namespace DungeonEngine::Input {

    class IGamepad : public IInputDevice {
    public:
        DeviceType getDeviceType() const override { return DeviceType::GAMEPAD; }

        virtual bool isButtonPressed(GamepadButton button) const = 0;
        virtual bool isButtonReleased(GamepadButton button) const = 0;
        virtual bool isButtonHeld(GamepadButton button) const = 0;

        virtual Core::f32 getAxisValue(GamepadAxis axis) const = 0;
        virtual void setDeadZone(GamepadAxis axis, Core::f32 deadZone) = 0;
        virtual Core::f32 getDeadZone(GamepadAxis axis) const = 0;

        // Vibration interface stub (for future milestones)
        virtual void setVibration(Core::f32 leftMotor, Core::f32 rightMotor) = 0;
    };

}
