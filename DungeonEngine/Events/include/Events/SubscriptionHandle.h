#pragma once

#include "Core/Types.h"
#include <functional>

namespace DungeonEngine {

    class SubscriptionHandle {
    public:
        SubscriptionHandle() : m_Id(0) {}
        explicit SubscriptionHandle(Core::u64 id) : m_Id(id) {}

        bool IsValid() const { return m_Id != 0; }
        Core::u64 GetId() const { return m_Id; }

        bool operator==(const SubscriptionHandle& other) const { return m_Id == other.m_Id; }
        bool operator!=(const SubscriptionHandle& other) const { return m_Id != other.m_Id; }

    private:
        Core::u64 m_Id;
    };

} // namespace DungeonEngine

namespace std {
    template<>
    struct hash<DungeonEngine::SubscriptionHandle> {
        std::size_t operator()(const DungeonEngine::SubscriptionHandle& handle) const {
            return std::hash<Core::u64>()(handle.GetId());
        }
    };
}
