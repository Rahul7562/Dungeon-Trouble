#include "World/TileMap.h"
#include <cmath>

namespace DungeonEngine::World {

    TileMap::TileMap(Core::u32 width, Core::u32 height, Core::f32 tileSize, Core::f32 originX, Core::f32 originY)
        : m_Width(width), m_Height(height), m_TileSize(tileSize), m_OriginX(originX), m_OriginY(originY) {
        m_Tiles.resize(width * height, TileType::Empty);
    }

    TileType TileMap::Get(Core::i32 x, Core::i32 y) const {
        if (x < 0 || x >= static_cast<Core::i32>(m_Width) || y < 0 || y >= static_cast<Core::i32>(m_Height)) {
            return TileType::Wall;
        }
        return m_Tiles[y * m_Width + x];
    }

    void TileMap::Set(Core::i32 x, Core::i32 y, TileType type) {
        if (x >= 0 && x < static_cast<Core::i32>(m_Width) && y >= 0 && y < static_cast<Core::i32>(m_Height)) {
            m_Tiles[y * m_Width + x] = type;
        }
    }

    TileCoord TileMap::WorldToTile(Core::f32 wx, Core::f32 wy) const {
        Core::f32 relX = wx - m_OriginX;
        Core::f32 relY = wy - m_OriginY;
        return {
            static_cast<Core::i32>(std::floor(relX / m_TileSize)),
            static_cast<Core::i32>(std::floor(relY / m_TileSize))
        };
    }

    WorldCoord TileMap::TileToWorldCenter(Core::i32 tx, Core::i32 ty) const {
        return {
            m_OriginX + (tx * m_TileSize) + (m_TileSize * 0.5f),
            m_OriginY + (ty * m_TileSize) + (m_TileSize * 0.5f)
        };
    }

} // namespace DungeonEngine::World
