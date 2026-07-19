#pragma once
#include <Core/Types.h>

namespace DungeonEngine {

struct SimContext {
    Core::u64 tickNumber;
    Core::f32 fixedDelta;
    Core::u64 randomSeed;
};

} // namespace DungeonEngine
