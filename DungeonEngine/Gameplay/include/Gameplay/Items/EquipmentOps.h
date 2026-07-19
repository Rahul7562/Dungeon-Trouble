#pragma once
#include <Core/Types.h>
#include <Core/Result.h>
#include <Gameplay/Items/Equipment.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Items/ItemDefTable.h>

namespace DungeonEngine {
namespace Gameplay {

class EquipmentOps {
public:
    // Equips an item to its designated slot, returning previously equipped defId (0 if none)
    // Applies modifiers to StatSheet with sourceId = 1000000 + slot index
    static Core::Result<Core::u32> Equip(
        Equipment& equip,
        StatSheet& stats,
        const ItemDefTable& table,
        Core::u32 defId
    );

    // Unequips an item from the specified slot, returning the defId (0 if none was equipped)
    // Removes the applied modifiers from the StatSheet
    static Core::u32 Unequip(
        Equipment& equip,
        StatSheet& stats,
        EquipSlot slot
    );
};

} // namespace Gameplay
} // namespace DungeonEngine
