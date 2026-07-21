#pragma once

#include "Core/Types.h"

namespace DungeonEngine::World {

    enum class TileType : Core::u8 {
        Empty = 0,
        Floor,
        Wall,
        Pit,
        Water,
        Lava
    };

    namespace TileFlags {
        inline bool IsWalkable(TileType type) {
            return type == TileType::Floor;
        }

        inline bool BlocksProjectiles(TileType type) {
            return type == TileType::Wall;
        }

        inline bool IsHazard(TileType type) {
            return type == TileType::Pit || type == TileType::Water || type == TileType::Lava;
        }
    }

} // namespace DungeonEngine::World
