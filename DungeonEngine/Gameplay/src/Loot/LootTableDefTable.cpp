#include <Gameplay/Loot/LootTableDefTable.h>

namespace DungeonEngine {
namespace Gameplay {

void LootTableDefTable::Register(const LootTableDef& def) {
    m_tables[def.id] = def;
}

const LootTableDef* LootTableDefTable::Get(Core::u32 id) const {
    auto it = m_tables.find(id);
    if (it != m_tables.end()) {
        return &it->second;
    }
    return nullptr;
}

} // namespace Gameplay
} // namespace DungeonEngine
