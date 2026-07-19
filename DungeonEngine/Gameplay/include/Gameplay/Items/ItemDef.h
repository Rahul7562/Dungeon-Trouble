#pragma once
#include <Core/Types.h>
#include <Gameplay/Items/ItemRarity.h>
#include <Gameplay/Items/EquipSlot.h>
#include <Gameplay/Stats/StatModifier.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

struct ItemDef {
    Core::u32 id = 0;
    Core::String name;
    ItemRarity rarity = ItemRarity::Common;
    EquipSlot slot = EquipSlot::None;
    Core::u32 maxStack = 1; // 1 for equipment
    std::vector<StatModifier> equipModifiers;
};

} // namespace Gameplay
} // namespace DungeonEngine
