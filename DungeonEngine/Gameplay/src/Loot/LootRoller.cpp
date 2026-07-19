#include <Gameplay/Loot/LootRoller.h>

namespace DungeonEngine {
namespace Gameplay {

void LootRoller::Roll(const LootTableDef& table, SimRandom& rng, std::vector<ItemStack>& out) {
    std::vector<const LootEntry*> nonGuaranteed;
    Core::f32 totalWeight = 0.0f;

    // Process guaranteed entries and gather non-guaranteed entries
    for (const auto& entry : table.entries) {
        if (entry.guaranteed) {
            Core::u32 count = static_cast<Core::u32>(rng.NextRange(static_cast<Core::i32>(entry.minCount), static_cast<Core::i32>(entry.maxCount)));
            if (count > 0) {
                out.push_back({entry.itemDefId, count});
            }
        } else {
            nonGuaranteed.push_back(&entry);
            totalWeight += entry.weight;
        }
    }

    // Process weighted non-guaranteed entries
    if (nonGuaranteed.empty() || totalWeight <= 0.0f) {
        return;
    }

    for (Core::i32 i = 0; i < table.rolls; ++i) {
        Core::f32 pick = rng.NextFloat01() * totalWeight;
        Core::f32 currentWeight = 0.0f;

        for (const LootEntry* entry : nonGuaranteed) {
            currentWeight += entry->weight;
            if (pick <= currentWeight) {
                Core::u32 count = static_cast<Core::u32>(rng.NextRange(static_cast<Core::i32>(entry->minCount), static_cast<Core::i32>(entry->maxCount)));
                if (count > 0) {
                    out.push_back({entry->itemDefId, count});
                }
                break;
            }
        }
    }
}

} // namespace Gameplay
} // namespace DungeonEngine
