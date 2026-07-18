#include <catch_amalgamated.hpp>

namespace DungeonEngine {
namespace Math {
    void initMath();
}
}

TEST_CASE("MathModule Initialization", "[Math][MathModule]") {
    SECTION("initMath executes without throwing") {
        REQUIRE_NOTHROW(DungeonEngine::Math::initMath());
    }
}
