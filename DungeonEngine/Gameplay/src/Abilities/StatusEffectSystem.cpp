#include <Gameplay/Abilities/StatusEffectSystem.h>
#include <Gameplay/Abilities/AbilityComponents.h>
#include <Gameplay/Combat/Components.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <Simulation/SimContext.h>
#include <vector>

namespace DungeonEngine::Gameplay {

StatusEffectSystem::StatusEffectSystem(ECS::Registry* registry, CombatSystem* combatSystem, const StatusEffectDefTable* statusEffectDefTable)
    : m_registry(registry)
    , m_combatSystem(combatSystem)
    , m_statusEffectDefTable(statusEffectDefTable)
{
}

void StatusEffectSystem::Tick(SimContext& context) {
    (void)context;

    auto view = m_registry->GetView<ActiveStatusEffects>();

    view.Each([&](ECS::Entity entity, ActiveStatusEffects& activeEffectsRef) {
        auto* activeEffects = &activeEffectsRef;
        bool hasStun = false;

        for (auto it = activeEffects->effects.begin(); it != activeEffects->effects.end(); ) {
            const StatusEffectDef* def = m_statusEffectDefTable->Get(it->defId);
            if (!def) {
                it = activeEffects->effects.erase(it);
                continue;
            }

            // Decrement timers
            it->remainingTicks--;
            it->nextTickIn--;

            // Tick proc
            if (it->nextTickIn <= 0 && def->tickInterval > 0) {
                if (def->kind == StatusKind::DamageOverTime && m_combatSystem) {
                    DamageEvent dmg;
                    dmg.source = it->source;
                    dmg.target = entity;
                    dmg.baseAmount = def->magnitudePerTick;
                    dmg.school = def->school;
                    // Note: DoT does not have TrueDamage by default unless specified, but prompt says "TrueDamage flag OFF, CanCrit OFF"
                    dmg.flags = 0;
                    m_combatSystem->QueueDamage(dmg);
                } else if (def->kind == StatusKind::HealOverTime) {
                    auto* health = m_registry->GetComponent<Health>(entity);
                    if (health) {
                        health->current += def->magnitudePerTick;
                        if (health->current > health->max) {
                            health->current = health->max;
                        }
                    }
                }

                it->nextTickIn = def->tickInterval;
            }

            // Expiry
            if (it->remainingTicks <= 0) {
                if (def->kind == StatusKind::StatBuff) {
                    auto* statSheet = m_registry->GetComponent<StatSheet>(entity);
                    if (statSheet) {
                        StatCalculator::RemoveModifiersFromSource(*statSheet, 2000000 + def->id);
                    }
                }
                // We'll check StunnedTag at the end based on remaining stuns

                it = activeEffects->effects.erase(it);
            } else {
                if (def->kind == StatusKind::Stun) {
                    hasStun = true;
                }
                ++it;
            }
        }

        // Clean up StunnedTag if no stuns remain
        if (!hasStun && m_registry->HasComponent<StunnedTag>(entity)) {
            m_commandBuffer.RemoveComponent<StunnedTag>(entity);
        }
    });

    m_commandBuffer.Flush(*m_registry);
}

} // namespace DungeonEngine::Gameplay
