#include <Gameplay/Abilities/StatusEffectDefTable.h>

namespace DungeonEngine::Gameplay {

void StatusEffectDefTable::Register(const StatusEffectDef& def) {
    m_statusEffects[def.id] = def;
}

const StatusEffectDef* StatusEffectDefTable::Get(Core::u32 id) const {
    auto it = m_statusEffects.find(id);
    if (it != m_statusEffects.end()) {
        return &it->second;
    }
    return nullptr;
}

} // namespace DungeonEngine::Gameplay
