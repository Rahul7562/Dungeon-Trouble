#pragma once
#include <ECS/Entity.h>
#include <vector>

namespace DungeonEngine {
namespace ECS {

class EntityRegistry {
public:
    Entity Create();
    void Destroy(Entity entity);
    bool IsAlive(Entity entity) const;
    void Clear();

private:
    std::vector<Core::u32> m_generations;
    std::vector<Core::u32> m_freeList;
};

} // namespace ECS
} // namespace DungeonEngine
