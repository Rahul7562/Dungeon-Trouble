#include <Gameplay/Stats/StatCalculator.h>
#include <Gameplay/Stats/StatFormulas.h>
#include <algorithm>

namespace DungeonEngine {
namespace Gameplay {

void StatCalculator::Recalculate(StatSheet& sheet) {
    if (!sheet.isDirty) {
        return;
    }

    Core::f32 str = static_cast<Core::f32>(sheet.attributes[static_cast<Core::u8>(AttributeType::STR)]);
    Core::f32 dex = static_cast<Core::f32>(sheet.attributes[static_cast<Core::u8>(AttributeType::DEX)]);
    Core::f32 intel = static_cast<Core::f32>(sheet.attributes[static_cast<Core::u8>(AttributeType::INT)]);
    Core::f32 vit = static_cast<Core::f32>(sheet.attributes[static_cast<Core::u8>(AttributeType::VIT)]);

    Core::f32 baseStats[static_cast<Core::u8>(StatType::COUNT)];

    baseStats[static_cast<Core::u8>(StatType::MaxHealth)] = StatFormulas::BaseMaxHealth + vit * StatFormulas::MaxHealthPerVit;
    baseStats[static_cast<Core::u8>(StatType::MaxMana)] = StatFormulas::BaseMaxMana + intel * StatFormulas::MaxManaPerInt;
    baseStats[static_cast<Core::u8>(StatType::AttackPower)] = str * StatFormulas::AttackPowerPerStr + dex * StatFormulas::AttackPowerPerDex;
    baseStats[static_cast<Core::u8>(StatType::SpellPower)] = intel * StatFormulas::SpellPowerPerInt;
    baseStats[static_cast<Core::u8>(StatType::Armor)] = str * StatFormulas::ArmorPerStr + dex * StatFormulas::ArmorPerDex;
    baseStats[static_cast<Core::u8>(StatType::Evasion)] = dex * StatFormulas::EvasionPerDex;
    baseStats[static_cast<Core::u8>(StatType::CritChance)] = StatFormulas::BaseCritChance + dex * StatFormulas::CritChancePerDex;
    baseStats[static_cast<Core::u8>(StatType::CritMultiplier)] = StatFormulas::BaseCritMultiplier;
    baseStats[static_cast<Core::u8>(StatType::MoveSpeed)] = StatFormulas::BaseMoveSpeed;
    baseStats[static_cast<Core::u8>(StatType::CooldownReduction)] = StatFormulas::BaseCooldownReduction;

    Core::f32 flatAdd[static_cast<Core::u8>(StatType::COUNT)] = {0.0f};
    Core::f32 percentAdd[static_cast<Core::u8>(StatType::COUNT)] = {0.0f};
    Core::f32 percentMult[static_cast<Core::u8>(StatType::COUNT)];
    for (int i = 0; i < static_cast<Core::u8>(StatType::COUNT); ++i) {
        percentMult[i] = 1.0f;
    }

    for (const auto& mod : sheet.modifiers) {
        Core::u8 statIdx = static_cast<Core::u8>(mod.stat);
        switch (mod.op) {
            case ModifierOp::Flat:
                flatAdd[statIdx] += mod.value;
                break;
            case ModifierOp::PercentAdd:
                percentAdd[statIdx] += mod.value;
                break;
            case ModifierOp::PercentMult:
                percentMult[statIdx] *= (1.0f + mod.value / 100.0f);
                break;
        }
    }

    for (Core::u8 i = 0; i < static_cast<Core::u8>(StatType::COUNT); ++i) {
        sheet.cachedStats[i] = (baseStats[i] + flatAdd[i]) * (1.0f + percentAdd[i] / 100.0f) * percentMult[i];
    }

    sheet.isDirty = false;
}

Core::f32 StatCalculator::GetStat(StatSheet& sheet, StatType stat) {
    if (sheet.isDirty) {
        Recalculate(sheet);
    }
    return sheet.cachedStats[static_cast<Core::u8>(stat)];
}

void StatCalculator::AddModifier(StatSheet& sheet, const StatModifier& modifier) {
    sheet.modifiers.push_back(modifier);
    sheet.isDirty = true;
}

void StatCalculator::RemoveModifiersFromSource(StatSheet& sheet, Core::u32 sourceId) {
    auto initialSize = sheet.modifiers.size();
    sheet.modifiers.erase(
        std::remove_if(sheet.modifiers.begin(), sheet.modifiers.end(),
            [sourceId](const StatModifier& mod) { return mod.sourceId == sourceId; }),
        sheet.modifiers.end());

    if (sheet.modifiers.size() != initialSize) {
        sheet.isDirty = true;
    }
}

void StatCalculator::TickModifiers(StatSheet& sheet) {
    auto initialSize = sheet.modifiers.size();
    bool modifiersChanged = false;

    for (auto& mod : sheet.modifiers) {
        if (mod.durationTicks > 0) {
            mod.durationTicks--;
            if (mod.durationTicks == 0) {
                modifiersChanged = true;
            }
        }
    }

    sheet.modifiers.erase(
        std::remove_if(sheet.modifiers.begin(), sheet.modifiers.end(),
            [](const StatModifier& mod) { return mod.durationTicks == 0; }),
        sheet.modifiers.end());

    if (modifiersChanged || sheet.modifiers.size() != initialSize) {
        sheet.isDirty = true;
    }
}

} // namespace Gameplay
} // namespace DungeonEngine
