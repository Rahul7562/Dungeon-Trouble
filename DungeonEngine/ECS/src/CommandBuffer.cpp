#include <ECS/CommandBuffer.h>

namespace DungeonEngine {
namespace ECS {

void CommandBuffer::DestroyEntity(Entity entity) {
    m_commands.push_back([entity](Registry& registry) {
        if (registry.IsAlive(entity)) {
            registry.Destroy(entity);
        }
    });
}

void CommandBuffer::Flush(Registry& registry) {
    for (auto& command : m_commands) {
        command(registry);
    }
    m_commands.clear();
}

void CommandBuffer::Clear() {
    m_commands.clear();
}

} // namespace ECS
} // namespace DungeonEngine
