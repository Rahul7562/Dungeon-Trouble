#pragma once
#include <memory>
#include <vector>
#include <algorithm>
#include "Simulation/ISimSystem.h"

namespace DungeonEngine {

class SystemScheduler {
public:
    SystemScheduler();

    void AddSystem(std::unique_ptr<ISimSystem> system, int phase);
    void TickAll(SimContext& context);

private:
    struct SystemEntry {
        std::unique_ptr<ISimSystem> system;
        int phase;
        Core::u64 registrationOrder;

        bool operator<(const SystemEntry& other) const {
            if (phase != other.phase) {
                return phase < other.phase;
            }
            return registrationOrder < other.registrationOrder;
        }
    };

    std::vector<SystemEntry> m_systems;
    Core::u64 m_nextRegistrationOrder;
    bool m_needsSort;
};

} // namespace DungeonEngine
