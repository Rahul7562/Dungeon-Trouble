#include <Gameplay/Combat/CombatSystem.h>
#include <Gameplay/Combat/Components.h>
#include <Gameplay/Combat/DamagePipeline.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Simulation/SimRandom.h>

namespace DungeonEngine::Gameplay {

CombatSystem::CombatSystem(ECS::Registry* registry, EventBus* eventBus)
    : m_registry(registry)
    , m_eventBus(eventBus)
{
}

void CombatSystem::QueueDamage(const DamageEvent& event) {
    m_damageQueue.push_back(event);
}

void CombatSystem::Tick(SimContext& context) {
    SimRandom rng(context.randomSeed);

    for (const auto& event : m_damageQueue) {
        if (!m_registry->IsAlive(event.source) || !m_registry->IsAlive(event.target)) {
            continue;
        }

        if (m_registry->HasComponent<DeadTag>(event.target)) {
            continue;
        }

        StatSheet* sourceStats = m_registry->GetComponent<StatSheet>(event.source);
        StatSheet* targetStats = m_registry->GetComponent<StatSheet>(event.target);
        Health* health = m_registry->GetComponent<Health>(event.target);

        if (!sourceStats || !targetStats || !health) {
            continue;
        }

        if (health->current <= 0.0f) {
            continue; // Entity died earlier in the same tick queue loop
        }

        ResolvedDamage resolved = DamagePipeline::Resolve(event, *sourceStats, *targetStats, rng);

        health->current -= resolved.amount;
        if (health->current < 0.0f) {
            health->current = 0.0f;
        }

        DamageAppliedEvent appliedEvent;
        appliedEvent.source = event.source;
        appliedEvent.target = event.target;
        appliedEvent.finalAmount = resolved.amount;
        appliedEvent.wasCrit = resolved.crit;

        m_eventBus->Enqueue(EventChannel::GAMEPLAY, appliedEvent);

        if (health->current == 0.0f) {
            m_commandBuffer.AddComponent<DeadTag>(event.target);

            EntityDiedEvent diedEvent;
            diedEvent.entity = event.target;
            diedEvent.killer = event.source;
            m_eventBus->Enqueue(EventChannel::GAMEPLAY, diedEvent);
        }
    }

    m_damageQueue.clear();
    m_commandBuffer.Flush(*m_registry);
}

} // namespace DungeonEngine::Gameplay
