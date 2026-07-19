#pragma once
#include <Core/Types.h>
#include <Gameplay/Combat/Events.h>

namespace DungeonEngine::Gameplay {

struct AbilityDef {
    Core::u32 id;
    Core::String name;
    Core::f32 baseDamage;
    DamageSchool school;
    Core::u8 damageFlags;
    Core::i32 cooldownTicks;
    Core::f32 manaCost;
    Core::f32 range;
    Core::u32 appliesStatusId; // 0 = none
};

} // namespace DungeonEngine::Gameplay
