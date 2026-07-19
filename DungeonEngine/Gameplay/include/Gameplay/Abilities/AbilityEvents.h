#pragma once
#include <Core/Types.h>
#include <ECS/Entity.h>
#include <type_traits>

namespace DungeonEngine::Gameplay {

struct AbilityCastEvent {
    ECS::Entity caster;
    Core::u32 abilityId;
    ECS::Entity target;
};

static_assert(std::is_trivially_copyable_v<AbilityCastEvent>, "AbilityCastEvent must be trivially copyable");

} // namespace DungeonEngine::Gameplay
