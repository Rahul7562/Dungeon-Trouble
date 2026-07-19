#include <ECS/EntityRegistry.h>
#include <Core/Assert.h>

namespace DungeonEngine {
namespace ECS {

Entity EntityRegistry::Create() {
    Core::u32 index;
    Core::u32 generation;

    if (!m_freeList.empty()) {
        index = m_freeList.back();
        m_freeList.pop_back();
        generation = m_generations[index];
    } else {
        index = static_cast<Core::u32>(m_generations.size());
        generation = 1;
        m_generations.push_back(generation);
    }

    return Entity(index, generation);
}

void EntityRegistry::Destroy(Entity entity) {
    DT_ASSERT(IsAlive(entity), "Attempted to destroy a dead entity.");

    Core::u32 index = entity.GetIndex();

    // Bump generation to invalidate existing handles
    m_generations[index]++;

    m_freeList.push_back(index);
}

bool EntityRegistry::IsAlive(Entity entity) const {
    if (entity == Entity::Null()) return false;
    Core::u32 index = entity.GetIndex();
    if (index >= m_generations.size()) return false;
    return m_generations[index] == entity.GetGeneration();
}

void EntityRegistry::Clear() {
    m_generations.clear();
    m_freeList.clear();
}

} // namespace ECS
} // namespace DungeonEngine
