#include "Simulation/SimulationLoop.h"

namespace DungeonEngine {

SimulationLoop::SimulationLoop(Core::u64 baseSeed, double tickRateHz, Core::u32 maxTicksPerAdvance)
    : m_clock(tickRateHz, maxTicksPerAdvance)
    , m_baseSeed(baseSeed)
{
}

void SimulationLoop::Update(double realDt) {
    Core::u32 ticksToRun = m_clock.Advance(realDt);

    for (Core::u32 i = 0; i < ticksToRun; ++i) {
        m_clock.IncrementTick();

        SimContext context;
        context.tickNumber = m_clock.GetTickNumber();
        context.fixedDelta = static_cast<Core::f32>(m_clock.GetFixedDelta());
        // Simple deterministic seed derivation:
        // Use a basic hash-like combine of base seed and tick number to get per-tick seed
        context.randomSeed = m_baseSeed ^ (context.tickNumber * 0x9E3779B97F4A7C15ULL);

        m_scheduler.TickAll(context);
    }
}

} // namespace DungeonEngine
