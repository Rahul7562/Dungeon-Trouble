#include "catch_amalgamated.hpp"
#include "FileSystem/Directory.h"

using namespace DungeonEngine::FileSystem;
using namespace Core;

TEST_CASE("Directory Basic Operations", "[FileSystem][Directory]") {
    Path testDir("test_dir_assets");

    SECTION("Create and Exists") {
        auto createRes = Directory::Create(testDir);
        REQUIRE(createRes.IsOk());
        REQUIRE(createRes.Get() == true);

        auto existsRes = Directory::Exists(testDir);
        REQUIRE(existsRes.IsOk());
        REQUIRE(existsRes.Get() == true);

        auto delRes = Directory::Delete(testDir);
        REQUIRE(delRes.IsOk());
        REQUIRE(delRes.Get() == true);
    }
}
