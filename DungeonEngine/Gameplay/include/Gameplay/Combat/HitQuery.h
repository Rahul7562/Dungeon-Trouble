#pragma once
#include <Core/Types.h>
#include <ECS/Registry.h>
#include <Gameplay/Combat/Components.h>
#include <vector>

namespace DungeonEngine::Gameplay {

class HitQuery {
public:
    static bool Overlaps(const HitShape& a, const HitShape& b);
    static void CollectOverlapping(ECS::Registry& registry, const HitShape& area, TeamId excludeTeam, std::vector<ECS::Entity>& out);
};

} // namespace DungeonEngine::Gameplay
