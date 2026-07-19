#pragma once
#include <Core/Types.h>
#include <Gameplay/Abilities/StatusEffectDef.h>
#include <unordered_map>

namespace DungeonEngine::Gameplay {

class StatusEffectDefTable {
public:
    StatusEffectDefTable() = default;

    void Register(const StatusEffectDef& def);
    const StatusEffectDef* Get(Core::u32 id) const;

private:
    std::unordered_map<Core::u32, StatusEffectDef> m_statusEffects;
};

} // namespace DungeonEngine::Gameplay
