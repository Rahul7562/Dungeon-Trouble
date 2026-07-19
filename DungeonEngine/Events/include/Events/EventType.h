#pragma once

#include "Core/Types.h"

namespace DungeonEngine {

    using EventTypeId = Core::u32;

    class EventTypeRegistry {
    public:
        template<typename T>
        static EventTypeId GetTypeId() {
            static const EventTypeId id = s_NextId++;
            return id;
        }

    private:
        static EventTypeId s_NextId;
    };

} // namespace DungeonEngine
