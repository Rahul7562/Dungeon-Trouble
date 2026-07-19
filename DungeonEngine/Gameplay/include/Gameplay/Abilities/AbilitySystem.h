#pragma once
#include <Simulation/ISimSystem.h>
#include <ECS/Registry.h>
#include <ECS/CommandBuffer.h>
#include <Events/EventBus.h>
#include <Gameplay/Combat/CombatSystem.h>
#include <Gameplay/Abilities/AbilityDefTable.h>
#include <Gameplay/Abilities/StatusEffectDefTable.h>
#include <ECS/Entity.h>
#include <vector>

namespace DungeonEngine::Gameplay {

struct CastRequest {
    ECS::Entity caster;
    Core::u32 abilityId;
    ECS::Entity target;
};

class AbilitySystem : public ISimSystem {
public:
    AbilitySystem(ECS::Registry* registry, EventBus* eventBus, CombatSystem* combatSystem, const AbilityDefTable* abilityDefTable, const StatusEffectDefTable* statusEffectDefTable);

    void Tick(SimContext& context) override;
    const char* GetName() const override { return "AbilitySystem"; }

    void QueueCast(const CastRequest& request);

    struct TickStats {
        Core::u32 casts;
        Core::u32 rejected;
    };
    TickStats GetLastTickStats() const { return m_lastTickStats; }

private:
    ECS::Registry* m_registry;
    EventBus* m_eventBus;
    CombatSystem* m_combatSystem;
    const AbilityDefTable* m_abilityDefTable;
    const StatusEffectDefTable* m_statusEffectDefTable;
    ECS::CommandBuffer m_commandBuffer;

    std::vector<CastRequest> m_castQueue;
    TickStats m_lastTickStats;
};

} // namespace DungeonEngine::Gameplay
