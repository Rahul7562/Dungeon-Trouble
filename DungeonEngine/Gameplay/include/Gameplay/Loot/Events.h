#pragma once
#include <Core/Types.h>
#include <ECS/Entity.h>
#include <type_traits>

namespace DungeonEngine {
namespace Gameplay {

struct LootDroppedEvent {
    ECS::Entity lootEntity;
    Core::u32 itemDefId;
    Core::u32 count;
};

static_assert(std::is_trivially_copyable_v<LootDroppedEvent>, "LootDroppedEvent must be trivially copyable");

} // namespace Gameplay
} // namespace DungeonEngine
