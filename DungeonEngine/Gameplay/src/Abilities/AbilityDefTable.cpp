#include <Gameplay/Abilities/AbilityDefTable.h>

namespace DungeonEngine::Gameplay {

void AbilityDefTable::Register(const AbilityDef& def) {
    m_abilities[def.id] = def;
}

const AbilityDef* AbilityDefTable::Get(Core::u32 id) const {
    auto it = m_abilities.find(id);
    if (it != m_abilities.end()) {
        return &it->second;
    }
    return nullptr;
}

} // namespace DungeonEngine::Gameplay
