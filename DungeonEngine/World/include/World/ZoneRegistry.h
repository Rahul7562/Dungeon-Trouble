#pragma once

#include "Core/Types.h"
#include "Core/Result.h"
#include "World/ZoneDef.h"
#include <unordered_map>

namespace DungeonEngine::World {

    // Helper dummy struct for Result type since std::variant doesn't support void
    struct Success {};

    class ZoneRegistry {
    public:
        ZoneRegistry() = default;

        Core::Result<Success> Register(ZoneDef zoneDef);
        const ZoneDef* Get(Core::u32 id) const;

    private:
        std::unordered_map<Core::u32, ZoneDef> m_Zones;
    };

} // namespace DungeonEngine::World
