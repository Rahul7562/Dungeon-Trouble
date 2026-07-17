#include "catch_amalgamated.hpp"
#include "FileSystem/Path.h"

using namespace DungeonEngine::FileSystem;

TEST_CASE("Path Basic Operations", "[FileSystem][Path]") {
    Path p("assets/textures/player.png");

    SECTION("Has correct components") {
        REQUIRE(p.HasExtension());
        REQUIRE(p.GetExtension() == Path(".png"));
        REQUIRE(p.GetFilename() == Path("player.png"));
        REQUIRE(p.GetStem() == Path("player"));
        REQUIRE(p.GetParentPath() == Path("assets/textures"));
        REQUIRE(!p.IsAbsolute());
        REQUIRE(p.IsRelative());
    }

    SECTION("Append and Concat") {
        Path base("assets");
        base.Append(Path("textures"));
        REQUIRE(base == Path("assets/textures"));

        base.Concat(Path("/player.png"));
        REQUIRE(base == Path("assets/textures/player.png"));
    }
}
