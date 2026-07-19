#pragma once
#include <ECS/Entity.h>
#include <ECS/EntityRegistry.h>
#include <ECS/ComponentStorage.h>
#include <ECS/View.h>
#include <unordered_map>
#include <memory>
#include <typeindex>

namespace DungeonEngine {
namespace ECS {

class CommandBuffer;

class Registry {
public:
    Registry() = default;
    ~Registry() = default;

    // Entity Management
    Entity Create();
    void Destroy(Entity entity);
    bool IsAlive(Entity entity) const;

    // Component Management
    template<typename T, typename... Args>
    T& AddComponent(Entity entity, Args&&... args) {
        return GetOrCreateStorage<T>()->Add(entity, std::forward<Args>(args)...);
    }

    template<typename T>
    void RemoveComponent(Entity entity) {
        ComponentStorage<T>* storage = GetStorage<T>();
        if (storage) {
            storage->Remove(entity);
        }
    }

    template<typename T>
    T* GetComponent(Entity entity) {
        ComponentStorage<T>* storage = GetStorage<T>();
        if (storage) {
            return storage->Get(entity);
        }
        return nullptr;
    }

    template<typename T>
    const T* GetComponent(Entity entity) const {
        ComponentStorage<T>* storage = GetStorage<T>();
        if (storage) {
            return storage->Get(entity);
        }
        return nullptr;
    }

    template<typename T>
    bool HasComponent(Entity entity) const {
        ComponentStorage<T>* storage = GetStorage<T>();
        if (storage) {
            return storage->Has(entity);
        }
        return false;
    }

    // Views
    template<typename... Ts>
    View<Ts...> GetView() {
        return View<Ts...>(*this);
    }

    // Non-templated storage retrieval for CommandBuffer
    IComponentStorage* GetStorageById(Core::u32 typeId) {
        auto it = m_storages.find(typeId);
        if (it != m_storages.end()) {
            return it->second.get();
        }
        return nullptr;
    }

private:
    // Type ID generation
    static Core::u32 GetNextTypeId() {
        static Core::u32 s_nextId = 0;
        return s_nextId++;
    }

    template<typename T>
    static Core::u32 ComponentTypeId() {
        static Core::u32 s_typeId = GetNextTypeId();
        return s_typeId;
    }

    template<typename T>
    ComponentStorage<T>* GetOrCreateStorage() {
        Core::u32 typeId = ComponentTypeId<T>();
        auto it = m_storages.find(typeId);
        if (it == m_storages.end()) {
            auto storage = std::make_unique<ComponentStorage<T>>();
            ComponentStorage<T>* ptr = storage.get();
            m_storages[typeId] = std::move(storage);
            return ptr;
        }
        return static_cast<ComponentStorage<T>*>(it->second.get());
    }

    template<typename T>
    ComponentStorage<T>* GetStorage() const {
        Core::u32 typeId = ComponentTypeId<T>();
        auto it = m_storages.find(typeId);
        if (it != m_storages.end()) {
            return static_cast<ComponentStorage<T>*>(it->second.get());
        }
        return nullptr;
    }

    EntityRegistry m_entityRegistry;
    std::unordered_map<Core::u32, std::unique_ptr<IComponentStorage>> m_storages;

    friend class CommandBuffer; // To allow accessing type IDs if needed
    template<typename... Ts> friend class View;
};

// Implement View helpers now that Registry is defined
template<typename... Ts>
template<typename T>
ComponentStorage<T>* View<Ts...>::GetStorage() {
    return m_registry.GetStorage<T>();
}

template<typename... Ts>
template<typename T>
T* View<Ts...>::GetComponent(Entity entity) {
    return m_registry.GetComponent<T>(entity);
}

template<typename... Ts>
template<typename T>
bool View<Ts...>::HasComponent(Entity entity) {
    return m_registry.HasComponent<T>(entity);
}

} // namespace ECS
} // namespace DungeonEngine
