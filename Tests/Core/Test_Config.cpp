#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Core/Config.h"

TEST_CASE("Config Set and Get") {
    Core::Config config;
    config.SetString("Name", "DungeonTrouble");
    config.SetInt("MaxPlayers", 64);

    REQUIRE(config.GetString("Name") == "DungeonTrouble");
    REQUIRE(config.GetInt("MaxPlayers") == 64);
    REQUIRE(config.GetInt("NonExistent", 10) == 10);
}
