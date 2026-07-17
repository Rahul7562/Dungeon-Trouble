#pragma once
#include "Core/Clock.h"

namespace Core {
    class Timer {
    public:
        Timer() { Reset(); }

        void Reset() { m_Start = Clock::Now(); }
        f64 ElapsedSeconds() const { return Clock::GetSeconds(m_Start, Clock::Now()); }
        f64 ElapsedMilliseconds() const { return Clock::GetMilliseconds(m_Start, Clock::Now()); }

    private:
        Clock::TimePoint m_Start;
    };
}
