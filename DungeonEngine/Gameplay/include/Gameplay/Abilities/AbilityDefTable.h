#pragma once
#include <Core/Types.h>
#include <Gameplay/Abilities/AbilityDef.h>
#include <unordered_map>

namespace DungeonEngine::Gameplay {

class AbilityDefTable {
public:
    AbilityDefTable() = default;

    void Register(const AbilityDef& def);
    const AbilityDef* Get(Core::u32 id) const;

private:
    std::unordered_map<Core::u32, AbilityDef> m_abilities;
};

} // namespace DungeonEngine::Gameplay
