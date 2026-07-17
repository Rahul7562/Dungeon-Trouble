#pragma once
#include <atomic>

namespace DungeonEngine::Threading {

    class AtomicFlag {
    public:
        AtomicFlag() : m_Flag(false) {}

        void Set() {
            m_Flag.store(true, std::memory_order_release);
        }

        void Clear() {
            m_Flag.store(false, std::memory_order_release);
        }

        bool IsSet() const {
            return m_Flag.load(std::memory_order_acquire);
        }

    private:
        std::atomic<bool> m_Flag;
    };

}
