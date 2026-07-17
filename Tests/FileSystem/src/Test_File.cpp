#include "catch_amalgamated.hpp"
#include "FileSystem/File.h"

using namespace DungeonEngine::FileSystem;
using namespace Core;

TEST_CASE("File Basic Operations", "[FileSystem][File]") {
    Path testFile("test_file.txt");

    SECTION("Write and Read Text") {
        String content = "Hello, DungeonTrouble!";
        auto writeRes = File::WriteAllText(testFile, content);
        REQUIRE(writeRes.IsOk());
        REQUIRE(writeRes.Get() == true);

        auto existsRes = File::Exists(testFile);
        REQUIRE(existsRes.IsOk());
        REQUIRE(existsRes.Get() == true);

        auto readRes = File::ReadAllText(testFile);
        REQUIRE(readRes.IsOk());
        REQUIRE(readRes.Get() == content);
    }

    SECTION("Delete File") {
        auto deleteRes = File::Delete(testFile);
        REQUIRE(deleteRes.IsOk());
        REQUIRE(deleteRes.Get() == true);

        auto existsRes = File::Exists(testFile);
        REQUIRE(existsRes.IsOk());
        REQUIRE(existsRes.Get() == false);
    }
}
