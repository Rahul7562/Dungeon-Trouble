#pragma once
#include "Core/Types.h"

namespace Core {
    struct Version {
        u16 Major;
        u16 Minor;
        u16 Patch;
        const char* BuildString;
    };

    constexpr Version ENGINE_VERSION = {0, 1, 0, "Milestone-2"};
}
