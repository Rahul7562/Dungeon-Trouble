#pragma once
#include <Core/Types.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

struct LootEntry {
    Core::u32 itemDefId = 0;
    Core::u32 minCount = 1;
    Core::u32 maxCount = 1;
    Core::f32 weight = 1.0f;
    bool guaranteed = false;
};

struct LootTableDef {
    Core::u32 id = 0;
    Core::i32 rolls = 1;
    std::vector<LootEntry> entries;
};

} // namespace Gameplay
} // namespace DungeonEngine
