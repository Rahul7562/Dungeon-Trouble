#pragma once
#include <ECS/Entity.h>
#include <vector>
#include <unordered_map>
#include <memory>
#include <Core/Assert.h>
#include <utility>

namespace DungeonEngine {
namespace ECS {

// Base interface for type-erased storage
class IComponentStorage {
public:
    virtual ~IComponentStorage() = default;
    virtual void Remove(Entity entity) = 0;
    virtual bool Has(Entity entity) const = 0;
    virtual void Clear() = 0;
    virtual void EntityDestroyed(Entity entity) = 0;
};

template<typename T>
class ComponentStorage : public IComponentStorage {
public:
    template<typename... Args>
    T& Add(Entity entity, Args&&... args) {
        DT_ASSERT(!Has(entity), "Entity already has this component.");

        Core::u32 entityIndex = entity.GetIndex();

        // Resize sparse array if needed
        if (entityIndex >= m_sparse.size()) {
            m_sparse.resize(entityIndex + 1, Entity::INVALID_INDEX);
        }

        Core::u32 denseIndex = static_cast<Core::u32>(m_dense.size());
        m_sparse[entityIndex] = denseIndex;
        m_dense.push_back(T{std::forward<Args>(args)...});
        m_entities.push_back(entity);

        return m_dense.back();
    }

    void Remove(Entity entity) override {
        if (!Has(entity)) return;

        Core::u32 entityIndex = entity.GetIndex();
        Core::u32 denseIndex = m_sparse[entityIndex];

        // Swap and pop
        Core::u32 lastDenseIndex = static_cast<Core::u32>(m_dense.size()) - 1;
        Entity lastEntity = m_entities.back();

        if (denseIndex != lastDenseIndex) {
            m_dense[denseIndex] = std::move(m_dense[lastDenseIndex]);
            m_entities[denseIndex] = lastEntity;
            m_sparse[lastEntity.GetIndex()] = denseIndex;
        }

        m_dense.pop_back();
        m_entities.pop_back();
        m_sparse[entityIndex] = Entity::INVALID_INDEX;
    }

    T* Get(Entity entity) {
        if (!Has(entity)) return nullptr;
        return &m_dense[m_sparse[entity.GetIndex()]];
    }

    const T* Get(Entity entity) const {
        if (!Has(entity)) return nullptr;
        return &m_dense[m_sparse[entity.GetIndex()]];
    }

    bool Has(Entity entity) const override {
        Core::u32 entityIndex = entity.GetIndex();
        if (entityIndex >= m_sparse.size()) return false;
        Core::u32 denseIndex = m_sparse[entityIndex];

        // If the dense index is valid and the entity in the dense array matches (generation check)
        return denseIndex != Entity::INVALID_INDEX && denseIndex < m_entities.size() && m_entities[denseIndex] == entity;
    }

    void Clear() override {
        m_dense.clear();
        m_sparse.clear();
        m_entities.clear();
    }

    void EntityDestroyed(Entity entity) override {
        Remove(entity);
    }

    size_t Size() const { return m_dense.size(); }

    // For Views
    const std::vector<Entity>& GetEntities() const { return m_entities; }

    // Direct access to dense arrays for fast iteration if needed
    std::vector<T>& GetDenseArray() { return m_dense; }
    const std::vector<T>& GetDenseArray() const { return m_dense; }

private:
    std::vector<T> m_dense;
    std::vector<Core::u32> m_sparse;
    std::vector<Entity> m_entities;
};

} // namespace ECS
} // namespace DungeonEngine
