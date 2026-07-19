#include <ECS/Registry.h>

namespace DungeonEngine {
namespace ECS {

Entity Registry::Create() {
    return m_entityRegistry.Create();
}

void Registry::Destroy(Entity entity) {
    if (!m_entityRegistry.IsAlive(entity)) return;

    // Remove from all storages
    for (auto& pair : m_storages) {
        pair.second->EntityDestroyed(entity);
    }

    m_entityRegistry.Destroy(entity);
}

bool Registry::IsAlive(Entity entity) const {
    return m_entityRegistry.IsAlive(entity);
}

} // namespace ECS
} // namespace DungeonEngine
