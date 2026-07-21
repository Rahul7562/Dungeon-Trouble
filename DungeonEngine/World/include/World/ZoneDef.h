#pragma once

#include "Core/Types.h"
#include "World/TileMap.h"
#include "World/SpawnPoint.h"
#include <vector>

namespace DungeonEngine::World {

    struct ZoneDef {
        Core::u32 id;
        Core::String name;
        TileMap tiles;
        std::vector<SpawnPoint> spawns;
    };

} // namespace DungeonEngine::World
