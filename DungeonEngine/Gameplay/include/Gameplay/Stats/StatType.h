#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

enum class StatType : Core::u8 {
    MaxHealth = 0,
    MaxMana,
    AttackPower,
    SpellPower,
    Armor,
    Evasion,
    CritChance,
    CritMultiplier,
    MoveSpeed,
    CooldownReduction,
    COUNT
};

} // namespace Gameplay
} // namespace DungeonEngine
