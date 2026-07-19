#pragma once
#include <Core/Types.h>
#include <Gameplay/Stats/StatType.h>
#include <Gameplay/Stats/ModifierOp.h>

namespace DungeonEngine {
namespace Gameplay {

struct StatModifier {
    Core::u32 sourceId;
    StatType stat;
    ModifierOp op;
    Core::f32 value;
    Core::i32 durationTicks; // -1 = permanent
};

} // namespace Gameplay
} // namespace DungeonEngine
