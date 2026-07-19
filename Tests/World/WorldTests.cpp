#include <catch_amalgamated.hpp>
#include "World/TileType.h"
#include "World/TileMap.h"
#include "World/SpawnPoint.h"
#include "World/ZoneDef.h"
#include "World/ZoneLoader.h"
#include "World/ZoneRegistry.h"
#include "Math/MathUtils.h"

using namespace DungeonEngine::World;
using namespace DungeonEngine::Math;

TEST_CASE("TileMap coordinate conversions and queries", "[World][TileMap]") {
    // 8x6, tile size 32.0f, origin (-100.0, -100.0)
    TileMap map(8, 6, 32.0f, -100.0f, -100.0f);

    SECTION("Get and Set round-trip") {
        map.Set(2, 3, TileType::Water);
        REQUIRE(map.Get(2, 3) == TileType::Water);
    }

    SECTION("Out-of-bounds Get returns Wall") {
        REQUIRE(map.Get(-1, 0) == TileType::Wall);
        REQUIRE(map.Get(8, 0) == TileType::Wall);
        REQUIRE(map.Get(0, 6) == TileType::Wall);
        REQUIRE(map.Get(0, -1) == TileType::Wall);
    }

    SECTION("WorldToTile and TileToWorldCenter round-trip") {
        // Tile 1, 1 -> center is at origin + 1*32 + 16 = -100 + 48 = -52
        WorldCoord wc = map.TileToWorldCenter(1, 1);
        REQUIRE(nearlyEqual(wc.x, -52.0f));
        REQUIRE(nearlyEqual(wc.y, -52.0f));

        TileCoord tc = map.WorldToTile(wc.x, wc.y);
        REQUIRE(tc.x == 1);
        REQUIRE(tc.y == 1);
    }
}

TEST_CASE("TileFlags behavior", "[World][TileFlags]") {
    REQUIRE(TileFlags::IsWalkable(TileType::Floor) == true);
    REQUIRE(TileFlags::IsWalkable(TileType::Wall) == false);

    REQUIRE(TileFlags::BlocksProjectiles(TileType::Wall) == true);
    REQUIRE(TileFlags::BlocksProjectiles(TileType::Floor) == false);

    REQUIRE(TileFlags::IsHazard(TileType::Pit) == true);
    REQUIRE(TileFlags::IsHazard(TileType::Water) == true);
    REQUIRE(TileFlags::IsHazard(TileType::Lava) == true);
    REQUIRE(TileFlags::IsHazard(TileType::Floor) == false);
}

TEST_CASE("ZoneLoader parsing", "[World][ZoneLoader]") {
    SECTION("Valid 8x6 zone") {
        Core::String validZone =
            "zone 42 TestZone\n"
            "size 8 6\n"
            "tilesize 10.0 0.0 0.0\n"
            "........\n"
            "########\n"
            "........\n"
            "P_P_P_P_\n"
            "WWWWLLLL\n"
            "........\n"
            "spawn 1 player 0 0 0\n"
            "spawn 2 enemy 1 1 100\n"
            "spawn 3 boss 7 5 200\n";

        auto result = ZoneLoader::LoadFromText(validZone);
        REQUIRE(result.IsOk());
        const ZoneDef& zone = result.Get();

        REQUIRE(zone.id == 42);
        REQUIRE(zone.name == "TestZone");
        REQUIRE(zone.tiles.GetWidth() == 8);
        REQUIRE(zone.tiles.GetHeight() == 6);

        REQUIRE(zone.tiles.Get(0, 0) == TileType::Floor);
        REQUIRE(zone.tiles.Get(0, 1) == TileType::Wall);
        REQUIRE(zone.tiles.Get(0, 3) == TileType::Pit);
        REQUIRE(zone.tiles.Get(1, 3) == TileType::Empty);
        REQUIRE(zone.tiles.Get(0, 4) == TileType::Water);
        REQUIRE(zone.tiles.Get(4, 4) == TileType::Lava);

        REQUIRE(zone.spawns.size() == 3);
        REQUIRE(zone.spawns[0].kind == SpawnKind::PlayerStart);
        REQUIRE(zone.spawns[0].refId == 0);
        WorldCoord wc0 = zone.tiles.TileToWorldCenter(0, 0);
        REQUIRE(nearlyEqual(zone.spawns[0].x, wc0.x));
        REQUIRE(nearlyEqual(zone.spawns[0].y, wc0.y));

        REQUIRE(zone.spawns[2].kind == SpawnKind::Boss);
        REQUIRE(zone.spawns[2].refId == 200);
        WorldCoord wc2 = zone.tiles.TileToWorldCenter(7, 5);
        REQUIRE(nearlyEqual(zone.spawns[2].x, wc2.x));
        REQUIRE(nearlyEqual(zone.spawns[2].y, wc2.y));
    }

    SECTION("Error cases mention line number") {
        Core::String badHeader = "size 8 6\n";
        auto res1 = ZoneLoader::LoadFromText(badHeader);
        REQUIRE(res1.IsError());
        REQUIRE(res1.GetError().find("Line 1") != Core::String::npos);

        Core::String wrongWidth =
            "zone 1 T\n"
            "size 8 6\n"
            "tilesize 10 0 0\n"
            "....\n";
        auto res2 = ZoneLoader::LoadFromText(wrongWidth);
        REQUIRE(res2.IsError());
        REQUIRE(res2.GetError().find("Line 4") != Core::String::npos);

        Core::String wrongChars =
            "zone 1 T\n"
            "size 2 1\n"
            "tilesize 10 0 0\n"
            ".X\n";
        auto res3 = ZoneLoader::LoadFromText(wrongChars);
        REQUIRE(res3.IsError());
        REQUIRE(res3.GetError().find("Line 4") != Core::String::npos);

        Core::String badSpawn =
            "zone 1 T\n"
            "size 1 1\n"
            "tilesize 10 0 0\n"
            ".\n"
            "spawn 1 nope 0 0 0\n";
        auto res4 = ZoneLoader::LoadFromText(badSpawn);
        REQUIRE(res4.IsError());
        REQUIRE(res4.GetError().find("Line 5") != Core::String::npos);

        Core::String dupSpawn =
            "zone 1 T\n"
            "size 1 1\n"
            "tilesize 10 0 0\n"
            ".\n"
            "spawn 1 player 0 0 0\n"
            "spawn 1 player 0 0 0\n";
        auto res5 = ZoneLoader::LoadFromText(dupSpawn);
        REQUIRE(res5.IsError());
        REQUIRE(res5.GetError().find("Line 6") != Core::String::npos);
    }
}

TEST_CASE("ZoneRegistry behavior", "[World][ZoneRegistry]") {
    ZoneRegistry registry;
    ZoneDef def;
    def.id = 10;
    def.name = "Test";

    REQUIRE(registry.Register(std::move(def)).IsOk());
    REQUIRE(registry.Get(10) != nullptr);
    REQUIRE(registry.Get(10)->name == "Test");
    REQUIRE(registry.Get(99) == nullptr);

    ZoneDef dupDef;
    dupDef.id = 10;
    REQUIRE(registry.Register(std::move(dupDef)).IsError());
}
