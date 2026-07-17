#pragma once
#include "Core/Types.h"
#include <string_view>

namespace Core {
    // FNV-1a Hash
    constexpr u64 HashString(std::string_view str) {
        u64 hash = 0xcbf29ce484222325ULL;
        for (char c : str) {
            hash ^= static_cast<u64>(c);
            hash *= 0x100000001b3ULL;
        }
        return hash;
    }
}
