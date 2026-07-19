#include <Gameplay/Combat/HitQuery.h>
#include <Math/MathUtils.h>

namespace DungeonEngine::Gameplay {

bool HitQuery::Overlaps(const HitShape& a, const HitShape& b) {
    if (a.kind == HitShape::Kind::Circle && b.kind == HitShape::Kind::Circle) {
        Core::f32 dx = a.x - b.x;
        Core::f32 dy = a.y - b.y;
        Core::f32 distanceSq = dx * dx + dy * dy;
        Core::f32 radiusSum = a.radius + b.radius;
        return distanceSq <= (radiusSum * radiusSum);
    } else if (a.kind == HitShape::Kind::AABB && b.kind == HitShape::Kind::AABB) {
        return (Math::abs(a.x - b.x) <= (a.halfW + b.halfW)) &&
               (Math::abs(a.y - b.y) <= (a.halfH + b.halfH));
    } else {
        const HitShape& circle = (a.kind == HitShape::Kind::Circle) ? a : b;
        const HitShape& aabb = (a.kind == HitShape::Kind::AABB) ? a : b;

        Core::f32 closestX = Math::clamp(circle.x, aabb.x - aabb.halfW, aabb.x + aabb.halfW);
        Core::f32 closestY = Math::clamp(circle.y, aabb.y - aabb.halfH, aabb.y + aabb.halfH);

        Core::f32 dx = circle.x - closestX;
        Core::f32 dy = circle.y - closestY;

        return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
    }
}

void HitQuery::CollectOverlapping(ECS::Registry& registry, const HitShape& area, TeamId excludeTeam, std::vector<ECS::Entity>& out) {
    auto view = registry.GetView<HitShape, TeamId>();
    view.Each([&](ECS::Entity entity, HitShape& shape, TeamId& team) {
        if (team.team == excludeTeam.team) {
            return;
        }

        if (Overlaps(area, shape)) {
            out.push_back(entity);
        }
    });
}

} // namespace DungeonEngine::Gameplay
