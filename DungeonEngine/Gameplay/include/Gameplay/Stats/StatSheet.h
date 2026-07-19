#pragma once
#include <Core/Types.h>
#include <Gameplay/Stats/AttributeType.h>
#include <Gameplay/Stats/StatType.h>
#include <Gameplay/Stats/StatModifier.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

struct StatSheet {
    // Base attributes
    Core::u32 attributes[static_cast<Core::u8>(AttributeType::COUNT)] = {0};

    // Active modifiers
    std::vector<StatModifier> modifiers;

    // Cached computed stats
    Core::f32 cachedStats[static_cast<Core::u8>(StatType::COUNT)] = {0.0f};

    // True if recalculation is needed before next read
    bool isDirty = true;
};

} // namespace Gameplay
} // namespace DungeonEngine
