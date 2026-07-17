#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Core/UUID.h"
#include <unordered_set>

TEST_CASE("UUID Generation is unique") {
    std::unordered_set<Core::u64> uuids;
    for (int i = 0; i < 1000; ++i) {
        Core::UUID id;
        REQUIRE(uuids.find(id) == uuids.end());
        uuids.insert(id);
    }
}
