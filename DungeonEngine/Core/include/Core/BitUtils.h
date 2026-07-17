#pragma once
#include "Core/Types.h"

namespace Core {
    namespace BitUtils {
        template<typename T>
        constexpr bool HasFlag(T value, T flag) {
            return (value & flag) == flag;
        }

        template<typename T>
        constexpr void SetFlag(T& value, T flag) {
            value |= flag;
        }

        template<typename T>
        constexpr void ClearFlag(T& value, T flag) {
            value &= ~flag;
        }
    }
}
