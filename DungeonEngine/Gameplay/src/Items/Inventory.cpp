#include <Gameplay/Items/Inventory.h>
#include <algorithm>

namespace DungeonEngine {
namespace Gameplay {

Inventory::Inventory(Core::u32 capacity_) : capacity(capacity_) {
    slots.resize(capacity, ItemStack{0, 0});
}

Core::u32 Inventory::AddItem(const ItemDefTable& table, Core::u32 defId, Core::u32 count) {
    if (count == 0) return 0;

    const ItemDef* def = table.Get(defId);
    if (!def) return count; // Invalid item

    Core::u32 remaining = count;

    // 1. Try to fill existing stacks first
    for (auto& stack : slots) {
        if (stack.defId == defId) {
            Core::u32 space = def->maxStack - stack.count;
            if (space > 0) {
                Core::u32 toAdd = std::min(space, remaining);
                stack.count += toAdd;
                remaining -= toAdd;

                if (remaining == 0) return 0;
            }
        }
    }

    // 2. Try to put in empty slots
    for (auto& stack : slots) {
        if (stack.defId == 0) {
            Core::u32 toAdd = std::min(def->maxStack, remaining);
            stack.defId = defId;
            stack.count = toAdd;
            remaining -= toAdd;

            if (remaining == 0) return 0;
        }
    }

    return remaining;
}

Core::u32 Inventory::RemoveItem(Core::u32 defId, Core::u32 count) {
    if (count == 0) return 0;

    Core::u32 remainingToRemove = count;

    for (auto& stack : slots) {
        if (stack.defId == defId) {
            Core::u32 toRemove = std::min(stack.count, remainingToRemove);
            stack.count -= toRemove;
            remainingToRemove -= toRemove;

            if (stack.count == 0) {
                stack.defId = 0; // Empty the slot
            }

            if (remainingToRemove == 0) break;
        }
    }

    return count - remainingToRemove;
}

Core::u32 Inventory::CountOf(Core::u32 defId) const {
    Core::u32 total = 0;
    for (const auto& stack : slots) {
        if (stack.defId == defId) {
            total += stack.count;
        }
    }
    return total;
}

} // namespace Gameplay
} // namespace DungeonEngine
