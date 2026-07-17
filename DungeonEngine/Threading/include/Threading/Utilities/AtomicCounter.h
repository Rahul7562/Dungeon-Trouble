#pragma once
#include <atomic>
#include "Core/Types.h"

namespace DungeonEngine::Threading {

    class AtomicCounter {
    public:
        AtomicCounter(Core::u32 initialValue = 0) : m_Counter(initialValue) {}

        Core::u32 Increment() {
            return m_Counter.fetch_add(1, std::memory_order_acq_rel) + 1;
        }

        Core::u32 Decrement() {
            return m_Counter.fetch_sub(1, std::memory_order_acq_rel) - 1;
        }

        Core::u32 Get() const {
            return m_Counter.load(std::memory_order_acquire);
        }

        void Set(Core::u32 value) {
            m_Counter.store(value, std::memory_order_release);
        }

    private:
        std::atomic<Core::u32> m_Counter;
    };

}
