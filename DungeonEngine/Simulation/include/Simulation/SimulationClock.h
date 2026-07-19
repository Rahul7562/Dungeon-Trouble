#pragma once
#include <Core/Types.h>

namespace DungeonEngine {

class SimulationClock {
public:
    SimulationClock(double tickRateHz = 30.0, Core::u32 maxTicksPerAdvance = 5);

    Core::u32 Advance(double dt);
    void IncrementTick();

    Core::u64 GetTickNumber() const;
    double GetFixedDelta() const;
    double GetInterpolationAlpha() const;

private:
    double m_tickRateHz;
    double m_fixedDelta;
    Core::u32 m_maxTicksPerAdvance;

    double m_accumulator;
    Core::u64 m_tickNumber;
};

} // namespace DungeonEngine
