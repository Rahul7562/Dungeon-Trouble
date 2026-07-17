#pragma once
#include "Input/IInputManager.h"
#include <vector>
#include <memory>
#include <algorithm>

namespace DungeonEngine::Input {

    class InputManager : public IInputManager {
    public:
        InputManager() = default;
        ~InputManager() override = default;

        void update() override {
            for (auto& device : m_devices) {
                device->update();
            }
        }

        void registerDevice(std::shared_ptr<IInputDevice> device) override {
            if (device && std::find(m_devices.begin(), m_devices.end(), device) == m_devices.end()) {
                m_devices.push_back(device);
            }
        }

        void unregisterDevice(std::shared_ptr<IInputDevice> device) override {
            auto it = std::find(m_devices.begin(), m_devices.end(), device);
            if (it != m_devices.end()) {
                m_devices.erase(it);
            }
        }

        const std::vector<std::shared_ptr<IInputDevice>>& getDevices() const override {
            return m_devices;
        }

    private:
        std::vector<std::shared_ptr<IInputDevice>> m_devices;
    };

}
