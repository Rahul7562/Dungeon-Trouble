#pragma once
#include <ECS/Entity.h>
#include <ECS/Registry.h>
#include <vector>
#include <functional>

namespace DungeonEngine {
namespace ECS {

class CommandBuffer {
public:
    void DestroyEntity(Entity entity);

    template<typename T, typename... Args>
    void AddComponent(Entity entity, Args&&... args) {
        // We capture the arguments in a lambda and store it in the command buffer.
        // For standard std::function, it might allocate if the captured args are large.
        // We ensure no exceptions and trivial copies where possible.
        // We must bind the arguments by value to defer execution safely.
        m_commands.push_back([entity, args = std::make_tuple(std::forward<Args>(args)...)](Registry& registry) mutable {
            if (registry.IsAlive(entity)) {
                std::apply([&registry, entity](auto&&... unpacked) {
                    registry.AddComponent<T>(entity, std::forward<decltype(unpacked)>(unpacked)...);
                }, std::move(args));
            }
        });
    }

    template<typename T>
    void RemoveComponent(Entity entity) {
        m_commands.push_back([entity](Registry& registry) {
            if (registry.IsAlive(entity)) {
                registry.RemoveComponent<T>(entity);
            }
        });
    }

    void Flush(Registry& registry);
    void Clear();

private:
    std::vector<std::function<void(Registry&)>> m_commands;
};

} // namespace ECS
} // namespace DungeonEngine
