#pragma once
#include <ECS/Entity.h>
#include <ECS/ComponentStorage.h>
#include <tuple>
#include <type_traits>

namespace DungeonEngine {
namespace ECS {

class Registry;

template<typename... Ts>
class View {
public:
    View(Registry& registry) : m_registry(registry) {}

    template<typename Func>
    void Each(Func&& func) {
        if constexpr (sizeof...(Ts) == 0) {
            return;
        } else {
            std::tuple<ComponentStorage<Ts>*...> storages = { GetStorage<Ts>()... };

            bool anyNull = ((std::get<ComponentStorage<Ts>*>(storages) == nullptr) || ...);
            if (anyNull) return;

            size_t minSize = static_cast<size_t>(-1);
            const std::vector<Entity>* smallestEntities = nullptr;

            auto checkStorage = [&](auto* storage) {
                if (storage && storage->Size() < minSize) {
                    minSize = storage->Size();
                    smallestEntities = &storage->GetEntities();
                }
            };

            (checkStorage(std::get<ComponentStorage<Ts>*>(storages)), ...);

            if (smallestEntities) {
                for (Entity entity : *smallestEntities) {
                    if (HasAllComponents(entity)) {
                        func(entity, *GetComponent<Ts>(entity)...);
                    }
                }
            }
        }
    }

private:
    Registry& m_registry;

    // Helper to get storage
    template<typename T>
    ComponentStorage<T>* GetStorage(); // Implemented in Registry.h to avoid circular dependency

    // Helper to get component pointer
    template<typename T>
    T* GetComponent(Entity entity); // Implemented in Registry.h

    // Check if entity has all components
    bool HasAllComponents(Entity entity) {
        return (HasComponent<Ts>(entity) && ...);
    }

    template<typename T>
    bool HasComponent(Entity entity); // Implemented in Registry.h
};

} // namespace ECS
} // namespace DungeonEngine
