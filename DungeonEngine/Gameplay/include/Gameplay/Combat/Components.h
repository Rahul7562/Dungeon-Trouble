#pragma once
#include <Core/Types.h>

namespace DungeonEngine::Gameplay {

struct Health {
    Core::f32 current;
    Core::f32 max;
};

struct TeamId {
    Core::u32 team;
};

struct HitShape {
    enum class Kind { Circle, AABB };
    Kind kind;
    Core::f32 x;
    Core::f32 y;
    Core::f32 radius;
    Core::f32 halfW;
    Core::f32 halfH;
};

struct DeadTag {
    // Empty marker component
};

} // namespace DungeonEngine::Gameplay
