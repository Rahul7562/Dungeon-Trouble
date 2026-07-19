#include <Gameplay/Items/EquipmentOps.h>
#include <Gameplay/Stats/StatCalculator.h>

namespace DungeonEngine {
namespace Gameplay {

static Core::u32 GetSourceIdForSlot(EquipSlot slot) {
    return 1000000 + static_cast<Core::u32>(slot);
}

Core::Result<Core::u32> EquipmentOps::Equip(
    Equipment& equip,
    StatSheet& stats,
    const ItemDefTable& table,
    Core::u32 defId
) {
    const ItemDef* def = table.Get(defId);
    if (!def) {
        return Core::Result<Core::u32>::Error("Invalid item ID");
    }

    if (def->slot == EquipSlot::None) {
        return Core::Result<Core::u32>::Error("Item cannot be equipped (slot is None)");
    }

    Core::u8 slotIdx = static_cast<Core::u8>(def->slot);
    Core::u32 prevDefId = equip.slots[slotIdx];

    // Remove previous modifiers
    if (prevDefId != 0) {
        StatCalculator::RemoveModifiersFromSource(stats, GetSourceIdForSlot(def->slot));
    }

    // Equip new item
    equip.slots[slotIdx] = defId;

    // Apply new modifiers
    Core::u32 sourceId = GetSourceIdForSlot(def->slot);
    for (const auto& mod : def->equipModifiers) {
        StatModifier appliedMod = mod;
        appliedMod.sourceId = sourceId;
        StatCalculator::AddModifier(stats, appliedMod);
    }

    return prevDefId;
}

Core::u32 EquipmentOps::Unequip(
    Equipment& equip,
    StatSheet& stats,
    EquipSlot slot
) {
    if (slot == EquipSlot::None) return 0;

    Core::u8 slotIdx = static_cast<Core::u8>(slot);
    Core::u32 prevDefId = equip.slots[slotIdx];

    if (prevDefId != 0) {
        StatCalculator::RemoveModifiersFromSource(stats, GetSourceIdForSlot(slot));
        equip.slots[slotIdx] = 0;
    }

    return prevDefId;
}

} // namespace Gameplay
} // namespace DungeonEngine
