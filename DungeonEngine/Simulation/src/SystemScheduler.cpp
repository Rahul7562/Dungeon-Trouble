#include "Simulation/SystemScheduler.h"

namespace DungeonEngine {

SystemScheduler::SystemScheduler()
    : m_nextRegistrationOrder(0)
    , m_needsSort(false)
{
}

void SystemScheduler::AddSystem(std::unique_ptr<ISimSystem> system, int phase) {
    m_systems.push_back({std::move(system), phase, m_nextRegistrationOrder++});
    m_needsSort = true;
}

void SystemScheduler::TickAll(SimContext& context) {
    if (m_needsSort) {
        std::sort(m_systems.begin(), m_systems.end());
        m_needsSort = false;
    }

    for (auto& entry : m_systems) {
        entry.system->Tick(context);
    }
}

} // namespace DungeonEngine
