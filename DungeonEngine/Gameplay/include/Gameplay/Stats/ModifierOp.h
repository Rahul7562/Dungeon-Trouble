#pragma once
#include <Core/Types.h>

namespace DungeonEngine {
namespace Gameplay {

enum class ModifierOp : Core::u8 {
    Flat = 0,
    PercentAdd,
    PercentMult
};

} // namespace Gameplay
} // namespace DungeonEngine
