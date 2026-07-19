#include "World/ZoneRegistry.h"

namespace DungeonEngine::World {

    Core::Result<Success> ZoneRegistry::Register(ZoneDef zoneDef) {
        if (m_Zones.find(zoneDef.id) != m_Zones.end()) {
            return Core::Result<Success>::Error("Zone with id " + std::to_string(zoneDef.id) + " is already registered.");
        }
        m_Zones.emplace(zoneDef.id, std::move(zoneDef));
        return Core::Result<Success>(Success{});
    }

    const ZoneDef* ZoneRegistry::Get(Core::u32 id) const {
        auto it = m_Zones.find(id);
        if (it != m_Zones.end()) {
            return &it->second;
        }
        return nullptr;
    }

} // namespace DungeonEngine::World
