#pragma once
#include <Core/Types.h>
#include "Simulation/SimulationClock.h"
#include "Simulation/SystemScheduler.h"

namespace DungeonEngine {

class SimulationLoop {
public:
    SimulationLoop(Core::u64 baseSeed = 0, double tickRateHz = 30.0, Core::u32 maxTicksPerAdvance = 5);

    void Update(double realDt);

    SystemScheduler& GetScheduler() { return m_scheduler; }
    const SimulationClock& GetClock() const { return m_clock; }

private:
    SimulationClock m_clock;
    SystemScheduler m_scheduler;
    Core::u64 m_baseSeed;
};

} // namespace DungeonEngine
