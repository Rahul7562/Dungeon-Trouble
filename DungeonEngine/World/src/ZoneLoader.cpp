#include "World/ZoneLoader.h"
#include <sstream>
#include <vector>
#include <unordered_set>

namespace DungeonEngine::World {

    Core::Result<ZoneDef> ZoneLoader::LoadFromText(const Core::String& text) {
        std::istringstream stream(text);
        Core::String line;
        Core::u32 lineNumber = 0;

        ZoneDef zoneDef;
        Core::u32 width = 0;
        Core::u32 height = 0;
        Core::f32 tileSize = 0.0f;
        Core::f32 originX = 0.0f;
        Core::f32 originY = 0.0f;

        // Line 1: zone <id> <name>
        if (!std::getline(stream, line)) return Core::Result<ZoneDef>::Error("Line 1: Missing zone definition");
        lineNumber++;
        std::istringstream line1(line);
        Core::String token;
        if (!(line1 >> token) || token != "zone") return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Expected 'zone'");
        if (!(line1 >> zoneDef.id)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid zone id");
        if (!(line1 >> zoneDef.name)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Missing zone name");

        // Line 2: size <width> <height>
        if (!std::getline(stream, line)) return Core::Result<ZoneDef>::Error("Line 2: Missing size definition");
        lineNumber++;
        std::istringstream line2(line);
        if (!(line2 >> token) || token != "size") return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Expected 'size'");
        if (!(line2 >> width)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid width");
        if (!(line2 >> height)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid height");

        // Line 3: tilesize <f32> <originX> <originY>
        if (!std::getline(stream, line)) return Core::Result<ZoneDef>::Error("Line 3: Missing tilesize definition");
        lineNumber++;
        std::istringstream line3(line);
        if (!(line3 >> token) || token != "tilesize") return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Expected 'tilesize'");
        if (!(line3 >> tileSize)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid tileSize");
        if (!(line3 >> originX)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid originX");
        if (!(line3 >> originY)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Invalid originY");

        zoneDef.tiles = TileMap(width, height, tileSize, originX, originY);

        // Map rows
        for (Core::u32 y = 0; y < height; ++y) {
            if (!std::getline(stream, line)) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber + 1) + ": Missing map row");
            lineNumber++;

            // Allow trailing spaces or carriage returns, but check we have at least width characters
            if (line.empty() && line.length() < width) return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Row too short");

            Core::u32 parsedChars = 0;
            for (char c : line) {
                if (c == '\r' || c == '\n' || c == ' ') continue;

                if (parsedChars >= width) break;

                TileType type;
                switch (c) {
                    case '.': type = TileType::Floor; break;
                    case '#': type = TileType::Wall; break;
                    case '_': type = TileType::Empty; break;
                    case 'P': type = TileType::Pit; break;
                    case 'W': type = TileType::Water; break;
                    case 'L': type = TileType::Lava; break;
                    default: return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Unknown tile char '" + Core::String(1, c) + "'");
                }
                zoneDef.tiles.Set(parsedChars, y, type);
                parsedChars++;
            }
            if (parsedChars < width) {
                 return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Row too short");
            }
        }

        std::unordered_set<Core::u32> spawnIds;

        // Spawns
        while (std::getline(stream, line)) {
            lineNumber++;
            if (line.empty() || line == "\r") continue;

            std::istringstream spawnLine(line);
            if (!(spawnLine >> token)) continue;
            if (token != "spawn") return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Expected 'spawn'");

            SpawnPoint spawn;
            Core::String kindStr;
            Core::i32 tileX, tileY;

            if (!(spawnLine >> spawn.id >> kindStr >> tileX >> tileY >> spawn.refId)) {
                return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Malformed spawn line");
            }

            if (spawnIds.find(spawn.id) != spawnIds.end()) {
                return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Duplicate spawn id " + std::to_string(spawn.id));
            }
            spawnIds.insert(spawn.id);

            if (kindStr == "player") spawn.kind = SpawnKind::PlayerStart;
            else if (kindStr == "enemy") spawn.kind = SpawnKind::Enemy;
            else if (kindStr == "boss") spawn.kind = SpawnKind::Boss;
            else if (kindStr == "chest") spawn.kind = SpawnKind::Chest;
            else return Core::Result<ZoneDef>::Error("Line " + std::to_string(lineNumber) + ": Unknown spawn kind '" + kindStr + "'");

            WorldCoord wc = zoneDef.tiles.TileToWorldCenter(tileX, tileY);
            spawn.x = wc.x;
            spawn.y = wc.y;

            zoneDef.spawns.push_back(spawn);
        }

        return Core::Result<ZoneDef>(std::move(zoneDef));
    }

} // namespace DungeonEngine::World
