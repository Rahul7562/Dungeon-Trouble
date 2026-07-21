#pragma once

#include "Core/Types.h"
#include "World/TileType.h"
#include <vector>

namespace DungeonEngine::World {

    struct TileCoord {
        Core::i32 x;
        Core::i32 y;
    };

    struct WorldCoord {
        Core::f32 x;
        Core::f32 y;
    };

    class TileMap {
    public:
        TileMap() = default;
        TileMap(Core::u32 width, Core::u32 height, Core::f32 tileSize, Core::f32 originX, Core::f32 originY);

        Core::u32 GetWidth() const { return m_Width; }
        Core::u32 GetHeight() const { return m_Height; }

        // Returns Wall for out-of-bounds queries. Treat map edge as solid.
        TileType Get(Core::i32 x, Core::i32 y) const;
        void Set(Core::i32 x, Core::i32 y, TileType type);

        TileCoord WorldToTile(Core::f32 wx, Core::f32 wy) const;
        WorldCoord TileToWorldCenter(Core::i32 tx, Core::i32 ty) const;

    private:
        Core::u32 m_Width = 0;
        Core::u32 m_Height = 0;
        Core::f32 m_TileSize = 1.0f;
        Core::f32 m_OriginX = 0.0f;
        Core::f32 m_OriginY = 0.0f;
        std::vector<TileType> m_Tiles;
    };

} // namespace DungeonEngine::World
