#pragma once
#include <Core/Types.h>
#include <ECS/Entity.h>
#include <vector>
#include <unordered_map>

namespace DungeonEngine::Gameplay {

struct AbilityBook {
    std::vector<Core::u32> abilityIds;
    std::unordered_map<Core::u32, Core::u64> cooldownReadyAtTick;
};

struct Mana {
    Core::f32 current;
    Core::f32 max;
};

struct ActiveStatusEffects {
    struct Instance {
        Core::u32 defId;
        ECS::Entity source;
        Core::i64 remainingTicks;
        Core::i64 nextTickIn;
    };
    std::vector<Instance> effects;
};

struct StunnedTag {
    // Empty marker component
};

} // namespace DungeonEngine::Gameplay
