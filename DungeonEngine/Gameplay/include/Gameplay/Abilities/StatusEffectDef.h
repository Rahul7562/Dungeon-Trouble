#pragma once
#include <Core/Types.h>
#include <Gameplay/Combat/Events.h>
#include <Gameplay/Stats/StatModifier.h>

namespace DungeonEngine::Gameplay {

enum class StatusKind : Core::u8 {
    DamageOverTime = 0,
    HealOverTime,
    Stun,
    StatBuff
};

struct StatusEffectDef {
    Core::u32 id;
    Core::String name;
    StatusKind kind;
    Core::f32 magnitudePerTick;
    DamageSchool school; // For DoT
    Core::i32 durationTicks;
    Core::i32 tickInterval;
    StatModifier statModifier; // For StatBuff
};

} // namespace DungeonEngine::Gameplay
