#include "Simulation/SimulationClock.h"

namespace DungeonEngine {

SimulationClock::SimulationClock(double tickRateHz, Core::u32 maxTicksPerAdvance)
    : m_tickRateHz(tickRateHz)
    , m_fixedDelta(1.0 / tickRateHz)
    , m_maxTicksPerAdvance(maxTicksPerAdvance)
    , m_accumulator(0.0)
    , m_tickNumber(0)
{
}

Core::u32 SimulationClock::Advance(double dt) {
    m_accumulator += dt;

    Core::u32 ticks = 0;
    while (m_accumulator >= m_fixedDelta && ticks < m_maxTicksPerAdvance) {
        m_accumulator -= m_fixedDelta;
        ticks++;
    }

    if (m_accumulator >= m_fixedDelta) {
        // We hit the cap, drop remaining time to prevent spiral of death
        m_accumulator = 0.0;
    }

    return ticks;
}

void SimulationClock::IncrementTick() {
    m_tickNumber++;
}

Core::u64 SimulationClock::GetTickNumber() const {
    return m_tickNumber;
}

double SimulationClock::GetFixedDelta() const {
    return m_fixedDelta;
}

double SimulationClock::GetInterpolationAlpha() const {
    return m_accumulator / m_fixedDelta;
}

} // namespace DungeonEngine
