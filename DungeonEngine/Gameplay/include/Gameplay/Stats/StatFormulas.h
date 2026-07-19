#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

namespace StatFormulas {
    // MaxHealth = 50 + VIT*10;
    constexpr Core::f32 BaseMaxHealth = 50.0f;
    constexpr Core::f32 MaxHealthPerVit = 10.0f;

    // MaxMana = 30 + INT*8;
    constexpr Core::f32 BaseMaxMana = 30.0f;
    constexpr Core::f32 MaxManaPerInt = 8.0f;

    // AttackPower = STR*2 + DEX;
    constexpr Core::f32 AttackPowerPerStr = 2.0f;
    constexpr Core::f32 AttackPowerPerDex = 1.0f;

    // SpellPower = INT*2;
    constexpr Core::f32 SpellPowerPerInt = 2.0f;

    // Armor = STR*0.5 + DEX*0.5;
    constexpr Core::f32 ArmorPerStr = 0.5f;
    constexpr Core::f32 ArmorPerDex = 0.5f;

    // Evasion = DEX*0.3;
    constexpr Core::f32 EvasionPerDex = 0.3f;

    // CritChance = 5 + DEX*0.1 (percent);
    constexpr Core::f32 BaseCritChance = 5.0f;
    constexpr Core::f32 CritChancePerDex = 0.1f;

    // CritMultiplier = 150 (percent);
    constexpr Core::f32 BaseCritMultiplier = 150.0f;

    // MoveSpeed = 100 (percent);
    constexpr Core::f32 BaseMoveSpeed = 100.0f;

    // CooldownReduction = 0;
    constexpr Core::f32 BaseCooldownReduction = 0.0f;
} // namespace StatFormulas

} // namespace Gameplay
} // namespace DungeonEngine
