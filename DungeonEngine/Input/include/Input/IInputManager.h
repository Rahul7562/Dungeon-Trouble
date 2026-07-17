#pragma once
#include "Input/IInputDevice.h"
#include <memory>
#include <vector>

namespace DungeonEngine::Input {

    class IInputManager {
    public:
        virtual ~IInputManager() = default;

        virtual void update() = 0;

        virtual void registerDevice(std::shared_ptr<IInputDevice> device) = 0;
        virtual void unregisterDevice(std::shared_ptr<IInputDevice> device) = 0;

        virtual const std::vector<std::shared_ptr<IInputDevice>>& getDevices() const = 0;

        template<typename T>
        std::shared_ptr<T> getDevice(DeviceType type) const {
            for (const auto& device : getDevices()) {
                if (device->getDeviceType() == type) {
                    return std::static_pointer_cast<T>(device);
                }
            }
            return nullptr;
        }
    };

}
