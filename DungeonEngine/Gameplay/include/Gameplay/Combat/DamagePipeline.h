#pragma once
#include <Core/Types.h>
#include <Gameplay/Combat/Events.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Simulation/SimRandom.h>

namespace DungeonEngine::Gameplay {

struct ResolvedDamage {
    Core::f32 amount;
    bool crit;
};

class DamagePipeline {
public:
    static ResolvedDamage Resolve(const DamageEvent& event, StatSheet& sourceStats, StatSheet& targetStats, SimRandom& rng);
};

} // namespace DungeonEngine::Gameplay
