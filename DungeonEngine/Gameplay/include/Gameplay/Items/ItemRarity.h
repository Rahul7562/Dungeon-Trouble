#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

enum class ItemRarity : Core::u8 {
    Common = 0,
    Uncommon,
    Rare,
    Epic,
    Legendary
};

} // namespace Gameplay
} // namespace DungeonEngine
