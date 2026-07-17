#pragma once
#include <cstdint>

namespace Core {
    namespace Endian {
        inline bool IsLittleEndian() {
            uint16_t number = 0x1;
            char *numPtr = (char*)&number;
            return (numPtr[0] == 1);
        }
    }
}
