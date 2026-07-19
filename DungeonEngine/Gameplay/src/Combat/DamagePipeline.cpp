#include <Gameplay/Combat/DamagePipeline.h>
#include <Gameplay/Stats/StatCalculator.h>

namespace DungeonEngine::Gameplay {

ResolvedDamage DamagePipeline::Resolve(const DamageEvent& event, StatSheet& sourceStats, StatSheet& targetStats, SimRandom& rng) {
    Core::f32 amount = event.baseAmount;

    // 1. School scaling
    if (event.school == DamageSchool::Physical) {
        amount += StatCalculator::GetStat(sourceStats, StatType::AttackPower) * 0.5f;
    } else {
        amount += StatCalculator::GetStat(sourceStats, StatType::SpellPower) * 0.5f;
    }

    // 2. Crit roll
    bool crit = false;
    if ((event.flags & DamageEvent::FLAG_CAN_CRIT) != 0) {
        Core::f32 critChance = StatCalculator::GetStat(sourceStats, StatType::CritChance) / 100.0f;
        if (rng.NextFloat01() < critChance) {
            crit = true;
            Core::f32 critMultiplier = StatCalculator::GetStat(sourceStats, StatType::CritMultiplier) / 100.0f;
            amount *= critMultiplier;
        }
    }

    // 3. Mitigation
    if ((event.flags & DamageEvent::FLAG_TRUE_DAMAGE) == 0) {
        if (event.school == DamageSchool::Physical) {
            if ((event.flags & DamageEvent::FLAG_IGNORE_ARMOR) == 0) {
                Core::f32 armor = StatCalculator::GetStat(targetStats, StatType::Armor);
                Core::f32 reduction = armor / (armor + 100.0f);
                amount *= (1.0f - reduction);
            }
        }
        // Other schools: no resist stat yet, pass through
    }

    // 4. Clamp >= 0
    if (amount < 0.0f) {
        amount = 0.0f;
    }

    // 5. Truncate to i32 then back to f32 for determinism
    Core::i32 truncated = static_cast<Core::i32>(amount);
    amount = static_cast<Core::f32>(truncated);

    return {amount, crit};
}

} // namespace DungeonEngine::Gameplay
