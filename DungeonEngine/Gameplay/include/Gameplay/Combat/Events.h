#pragma once
#include <Core/Types.h>
#include <ECS/Entity.h>
#include <type_traits>

namespace DungeonEngine::Gameplay {

enum class DamageSchool : Core::u8 {
    Physical = 0,
    Fire,
    Frost,
    Arcane,
    Shadow
};

struct DamageEvent {
    ECS::Entity source;
    ECS::Entity target;
    Core::f32 baseAmount;
    DamageSchool school;
    Core::u8 flags; // bitmask: CanCrit=1, IgnoreArmor=2, TrueDamage=4

    static constexpr Core::u8 FLAG_CAN_CRIT = 1 << 0;
    static constexpr Core::u8 FLAG_IGNORE_ARMOR = 1 << 1;
    static constexpr Core::u8 FLAG_TRUE_DAMAGE = 1 << 2;
};

struct DamageAppliedEvent {
    ECS::Entity source;
    ECS::Entity target;
    Core::f32 finalAmount;
    bool wasCrit;
};

struct EntityDiedEvent {
    ECS::Entity entity;
    ECS::Entity killer;
};

static_assert(std::is_trivially_copyable_v<DamageEvent>, "DamageEvent must be trivially copyable");
static_assert(std::is_trivially_copyable_v<DamageAppliedEvent>, "DamageAppliedEvent must be trivially copyable");
static_assert(std::is_trivially_copyable_v<EntityDiedEvent>, "EntityDiedEvent must be trivially copyable");

} // namespace DungeonEngine::Gameplay
