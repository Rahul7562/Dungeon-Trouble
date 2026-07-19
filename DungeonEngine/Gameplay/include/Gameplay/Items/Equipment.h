#pragma once
#include <Core/Types.h>
#include <Gameplay/Items/EquipSlot.h>

namespace DungeonEngine {
namespace Gameplay {

struct Equipment {
    // Array storing item defIds equipped in each slot
    Core::u32 slots[static_cast<Core::u8>(EquipSlot::COUNT)] = {0};
};

} // namespace Gameplay
} // namespace DungeonEngine
