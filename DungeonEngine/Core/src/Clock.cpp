#include "Core/Clock.h"

namespace Core {
    Clock::TimePoint Clock::Now() {
        return std::chrono::high_resolution_clock::now();
    }

    f64 Clock::GetSeconds(TimePoint start, TimePoint end) {
        return std::chrono::duration_cast<std::chrono::duration<f64>>(end - start).count();
    }

    f64 Clock::GetMilliseconds(TimePoint start, TimePoint end) {
        return std::chrono::duration_cast<std::chrono::duration<f64, std::milli>>(end - start).count();
    }
}
