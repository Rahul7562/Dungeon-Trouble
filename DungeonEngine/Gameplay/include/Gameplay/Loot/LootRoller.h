#pragma once
#include <Gameplay/Loot/LootTypes.h>
#include <Gameplay/Items/ItemStack.h>
#include <Simulation/SimRandom.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

class LootRoller {
public:
    static void Roll(const LootTableDef& table, SimRandom& rng, std::vector<ItemStack>& out);
};

} // namespace Gameplay
} // namespace DungeonEngine
