#pragma once
#include "Core/Types.h"
#include <chrono>

namespace Core {
    class Clock {
    public:
        using TimePoint = std::chrono::time_point<std::chrono::high_resolution_clock>;

        static TimePoint Now();
        static f64 GetSeconds(TimePoint start, TimePoint end);
        static f64 GetMilliseconds(TimePoint start, TimePoint end);
    };
}
