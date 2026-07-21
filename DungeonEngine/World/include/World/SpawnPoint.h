#pragma once

#include "Core/Types.h"

namespace DungeonEngine::World {

    enum class SpawnKind : Core::u8 {
        PlayerStart,
        Enemy,
        Boss,
        Chest
    };

    struct SpawnPoint {
        Core::u32 id;
        Core::f32 x;
        Core::f32 y;
        SpawnKind kind;
        Core::u32 refId; // loot table / enemy archetype id, 0 = none
    };

} // namespace DungeonEngine::World
