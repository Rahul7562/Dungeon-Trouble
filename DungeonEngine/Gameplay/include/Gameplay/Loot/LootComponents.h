#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

struct LootComponent {
    Core::u32 lootTableId = 0;
};

struct DroppedLoot {
    Core::u32 itemDefId = 0;
    Core::u32 count = 0;
    Core::u64 droppedAtTick = 0;
};

} // namespace Gameplay
} // namespace DungeonEngine
