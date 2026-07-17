#pragma once
#include "Core/Clock.h"
#include "Core/Types.h"

namespace Core {
    class FrameTimer {
    public:
        FrameTimer() : m_LastFrame(Clock::Now()), m_DeltaTime(0.0) {}

        void Tick() {
            auto current = Clock::Now();
            m_DeltaTime = Clock::GetSeconds(m_LastFrame, current);
            m_LastFrame = current;
        }

        f32 GetDeltaTime() const { return static_cast<f32>(m_DeltaTime); }
    private:
        Clock::TimePoint m_LastFrame;
        f64 m_DeltaTime;
    };
}
