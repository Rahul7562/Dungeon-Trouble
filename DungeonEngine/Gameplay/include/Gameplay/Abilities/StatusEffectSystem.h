#pragma once
#include <Simulation/ISimSystem.h>
#include <ECS/Registry.h>
#include <ECS/CommandBuffer.h>
#include <Gameplay/Combat/CombatSystem.h>
#include <Gameplay/Abilities/StatusEffectDefTable.h>

namespace DungeonEngine::Gameplay {

class StatusEffectSystem : public ISimSystem {
public:
    StatusEffectSystem(ECS::Registry* registry, CombatSystem* combatSystem, const StatusEffectDefTable* statusEffectDefTable);

    void Tick(SimContext& context) override;
    const char* GetName() const override { return "StatusEffectSystem"; }

private:
    ECS::Registry* m_registry;
    CombatSystem* m_combatSystem;
    const StatusEffectDefTable* m_statusEffectDefTable;
    ECS::CommandBuffer m_commandBuffer;
};

} // namespace DungeonEngine::Gameplay
