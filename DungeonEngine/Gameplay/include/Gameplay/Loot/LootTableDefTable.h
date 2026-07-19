#pragma once
#include <Core/Types.h>
#include <Gameplay/Loot/LootTypes.h>
#include <unordered_map>

namespace DungeonEngine {
namespace Gameplay {

class LootTableDefTable {
public:
    void Register(const LootTableDef& def);
    const LootTableDef* Get(Core::u32 id) const;

private:
    std::unordered_map<Core::u32, LootTableDef> m_tables;
};

} // namespace Gameplay
} // namespace DungeonEngine
