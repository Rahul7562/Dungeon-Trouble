#include <Gameplay/Abilities/AbilitySystem.h>
#include <Gameplay/Abilities/AbilityComponents.h>
#include <Gameplay/Abilities/AbilityEvents.h>
#include <Gameplay/Combat/Components.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <Simulation/SimContext.h>
#include <algorithm>

namespace DungeonEngine::Gameplay {

AbilitySystem::AbilitySystem(ECS::Registry* registry, EventBus* eventBus, CombatSystem* combatSystem, const AbilityDefTable* abilityDefTable, const StatusEffectDefTable* statusEffectDefTable)
    : m_registry(registry)
    , m_eventBus(eventBus)
    , m_combatSystem(combatSystem)
    , m_abilityDefTable(abilityDefTable)
    , m_statusEffectDefTable(statusEffectDefTable)
{
    m_lastTickStats = {0, 0};
}

void AbilitySystem::QueueCast(const CastRequest& request) {
    m_castQueue.push_back(request);
}

void AbilitySystem::Tick(SimContext& context) {
    m_lastTickStats = {0, 0};

    // Use a local copy to allow QueueCast during tick (though we shouldn't have recursive casts right now)
    std::vector<CastRequest> currentQueue;
    currentQueue.swap(m_castQueue);

    for (const auto& request : currentQueue) {
        if (!m_registry->IsAlive(request.caster) || m_registry->HasComponent<DeadTag>(request.caster)) {
            m_lastTickStats.rejected++;
            continue;
        }

        if (m_registry->HasComponent<StunnedTag>(request.caster)) {
            m_lastTickStats.rejected++;
            continue;
        }

        auto* abilityBook = m_registry->GetComponent<AbilityBook>(request.caster);
        if (!abilityBook) {
            m_lastTickStats.rejected++;
            continue;
        }

        // Check if caster knows the ability
        if (std::find(abilityBook->abilityIds.begin(), abilityBook->abilityIds.end(), request.abilityId) == abilityBook->abilityIds.end()) {
            m_lastTickStats.rejected++;
            continue;
        }

        const AbilityDef* def = m_abilityDefTable->Get(request.abilityId);
        if (!def) {
            m_lastTickStats.rejected++;
            continue;
        }

        // Check cooldown
        if (abilityBook->cooldownReadyAtTick.count(request.abilityId) > 0) {
            if (context.tickNumber < abilityBook->cooldownReadyAtTick[request.abilityId]) {
                m_lastTickStats.rejected++;
                continue;
            }
        }

        // Check range (only if both have HitShape)
        if (m_registry->IsAlive(request.target)) {
            auto* casterShape = m_registry->GetComponent<HitShape>(request.caster);
            auto* targetShape = m_registry->GetComponent<HitShape>(request.target);
            if (casterShape && targetShape) {
                // simple float compare for now (centers distance)
                Core::f32 dx = targetShape->x - casterShape->x;
                Core::f32 dy = targetShape->y - casterShape->y;
                Core::f32 distSq = dx * dx + dy * dy;
                if (distSq > def->range * def->range) {
                    m_lastTickStats.rejected++;
                    continue;
                }
            }
        }

        // Check mana
        auto* mana = m_registry->GetComponent<Mana>(request.caster);
        if (def->manaCost > 0.0f) {
            if (!mana || mana->current < def->manaCost) {
                m_lastTickStats.rejected++;
                continue;
            }
        }

        // CAST SUCCEEDED

        // Spend mana
        if (mana && def->manaCost > 0.0f) {
            mana->current -= def->manaCost;
            if (mana->current < 0.0f) mana->current = 0.0f;
        }

        // Apply cooldown
        Core::f32 cdr = 0.0f;
        auto* statSheet = m_registry->GetComponent<StatSheet>(request.caster);
        if (statSheet) {
            cdr = StatCalculator::GetStat(*statSheet, StatType::CooldownReduction);
        }

        Core::f32 effectiveCooldown = def->cooldownTicks * (1.0f - cdr / 100.0f);
        if (effectiveCooldown < 0.0f) effectiveCooldown = 0.0f;

        abilityBook->cooldownReadyAtTick[request.abilityId] = context.tickNumber + static_cast<Core::u64>(effectiveCooldown);

        // Forward DamageEvent
        if (def->baseDamage > 0.0f && m_registry->IsAlive(request.target)) {
            DamageEvent dmg;
            dmg.source = request.caster;
            dmg.target = request.target;
            dmg.baseAmount = def->baseDamage;
            dmg.school = def->school;
            dmg.flags = def->damageFlags;

            if (m_combatSystem) {
                m_combatSystem->QueueDamage(dmg);
            }
        }

        // Apply Status Effect
        if (def->appliesStatusId != 0 && m_registry->IsAlive(request.target)) {
            const StatusEffectDef* statusDef = m_statusEffectDefTable->Get(def->appliesStatusId);
            if (statusDef) {
                // Since we are iterating over a local cast queue and not over ECS components,
                // we can directly add components to the registry. This fixes an issue where multiple
                // abilities in the same tick applying status effects to a new target would overwrite
                // each other in the command buffer.
                auto* activeEffects = m_registry->GetComponent<ActiveStatusEffects>(request.target);
                if (!activeEffects) {
                    activeEffects = &m_registry->AddComponent<ActiveStatusEffects>(request.target);
                }

                activeEffects->effects.push_back({statusDef->id, request.caster, statusDef->durationTicks, statusDef->tickInterval});

                // Special case: StatBuff needs immediate application
                if (statusDef->kind == StatusKind::StatBuff) {
                    auto* targetStats = m_registry->GetComponent<StatSheet>(request.target);
                    if (targetStats) {
                        StatModifier mod = statusDef->statModifier;
                        mod.sourceId = 2000000 + statusDef->id;
                        mod.durationTicks = statusDef->durationTicks;
                        StatCalculator::AddModifier(*targetStats, mod);
                    }
                }

                // Special case: StunnedTag needs immediate application
                if (statusDef->kind == StatusKind::Stun) {
                    if (!m_registry->HasComponent<StunnedTag>(request.target)) {
                        m_registry->AddComponent<StunnedTag>(request.target);
                    }
                }
            }
        }

        // Emit Event
        AbilityCastEvent castEvent{request.caster, request.abilityId, request.target};
        m_eventBus->Enqueue(EventChannel::GAMEPLAY, castEvent);

        m_lastTickStats.casts++;
    }

    m_commandBuffer.Flush(*m_registry);
}

} // namespace DungeonEngine::Gameplay
