#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

enum class EquipSlot : Core::u8 {
    None = 0,
    Head,
    Chest,
    Legs,
    Boots,
    MainHand,
    OffHand,
    Ring,
    Amulet,
    COUNT
};

} // namespace Gameplay
} // namespace DungeonEngine
