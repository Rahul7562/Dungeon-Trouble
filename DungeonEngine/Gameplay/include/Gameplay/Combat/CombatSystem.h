#pragma once
#include <Simulation/ISimSystem.h>
#include <ECS/Registry.h>
#include <ECS/CommandBuffer.h>
#include <Events/EventBus.h>
#include <Gameplay/Combat/Events.h>
#include <vector>

namespace DungeonEngine::Gameplay {

class CombatSystem : public ISimSystem {
public:
    CombatSystem(ECS::Registry* registry, EventBus* eventBus);

    void Tick(SimContext& context) override;
    const char* GetName() const override { return "CombatSystem"; }

    void QueueDamage(const DamageEvent& event);

private:
    ECS::Registry* m_registry;
    EventBus* m_eventBus;
    ECS::CommandBuffer m_commandBuffer;
    std::vector<DamageEvent> m_damageQueue;
};

} // namespace DungeonEngine::Gameplay
