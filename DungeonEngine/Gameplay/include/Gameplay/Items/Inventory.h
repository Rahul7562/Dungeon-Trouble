#pragma once
#include <Core/Types.h>
#include <Gameplay/Items/ItemStack.h>
#include <Gameplay/Items/ItemDefTable.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

struct Inventory {
    // Inventory is instantiated with a fixed capacity
    explicit Inventory(Core::u32 capacity = 24);

    std::vector<ItemStack> slots;
    Core::u32 capacity;

    // Returns remainder that did not fit (0 if fully added)
    Core::u32 AddItem(const ItemDefTable& table, Core::u32 defId, Core::u32 count);

    // Returns the amount actually removed
    Core::u32 RemoveItem(Core::u32 defId, Core::u32 count);

    // Count of a specific item in the inventory
    Core::u32 CountOf(Core::u32 defId) const;
};

} // namespace Gameplay
} // namespace DungeonEngine
