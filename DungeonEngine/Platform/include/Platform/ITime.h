#pragma once
#include "Core/Types.h"

namespace DungeonEngine::Platform {

    class ITime {
    public:
        virtual ~ITime() = default;

        virtual Core::f64 getAbsoluteTimeSeconds() const = 0;
        virtual void sleep(Core::u32 milliseconds) = 0;
    };

}
