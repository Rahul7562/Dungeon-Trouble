#pragma once
#include <Core/Types.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatModifier.h>

namespace DungeonEngine {
namespace Gameplay {

class StatCalculator {
public:
    static void Recalculate(StatSheet& sheet);
    static Core::f32 GetStat(StatSheet& sheet, StatType stat);
    static void AddModifier(StatSheet& sheet, const StatModifier& modifier);
    static void RemoveModifiersFromSource(StatSheet& sheet, Core::u32 sourceId);
    static void TickModifiers(StatSheet& sheet);
};

} // namespace Gameplay
} // namespace DungeonEngine
