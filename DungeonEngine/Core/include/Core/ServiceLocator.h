#pragma once
#include "Core/Module.h"
#include <unordered_map>
#include <typeindex>
#include <memory>
#include <vector>
#include "Core/Assert.h"

namespace Core {
    class ServiceLocator {
    public:
        ServiceLocator() = default;
        ~ServiceLocator() { Clear(); }

        ServiceLocator(const ServiceLocator&) = delete;
        ServiceLocator& operator=(const ServiceLocator&) = delete;

        template<typename T, typename... Args>
        void RegisterService(Args&&... args) {
            auto type = std::type_index(typeid(T));
            DT_ASSERT(m_Services.find(type) == m_Services.end(), "Service already registered!");

            auto instance = std::make_shared<T>(std::forward<Args>(args)...);
            m_Services[type] = instance;
            m_InitOrder.push_back(instance);
        }

        template<typename T>
        std::shared_ptr<T> GetService() {
            auto type = std::type_index(typeid(T));
            auto it = m_Services.find(type);
            DT_ASSERT(it != m_Services.end(), "Service not found!");
            return std::static_pointer_cast<T>(it->second);
        }

        void InitAll() {
            for (auto& service : m_InitOrder) {
                service->Init();
            }
        }

        void UpdateAll(float deltaTime) {
            for (auto& service : m_InitOrder) {
                service->Update(deltaTime);
            }
        }

        void Clear() {
            // Shutdown in reverse initialization order
            for (auto it = m_InitOrder.rbegin(); it != m_InitOrder.rend(); ++it) {
                (*it)->Shutdown();
            }
            m_InitOrder.clear();
            m_Services.clear();
        }

    private:
        std::unordered_map<std::type_index, std::shared_ptr<IModule>> m_Services;
        std::vector<std::shared_ptr<IModule>> m_InitOrder;
    };
}
