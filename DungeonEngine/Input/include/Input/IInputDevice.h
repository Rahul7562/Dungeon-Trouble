#pragma once
#include "Input/InputTypes.h"

namespace DungeonEngine::Input {

    class IInputDevice {
    public:
        virtual ~IInputDevice() = default;

        virtual void update() = 0;
        virtual DeviceType getDeviceType() const = 0;
        virtual bool isConnected() const = 0;
        virtual const Core::String& getName() const = 0;
    };

}
