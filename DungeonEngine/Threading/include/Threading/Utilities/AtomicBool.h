#pragma once
#include <atomic>

namespace DungeonEngine::Threading {

    class AtomicBool {
    public:
        AtomicBool(bool initialValue = false) : m_Bool(initialValue) {}

        bool Exchange(bool value) {
            return m_Bool.exchange(value, std::memory_order_acq_rel);
        }

        bool CompareExchange(bool& expected, bool desired) {
            return m_Bool.compare_exchange_strong(expected, desired, std::memory_order_acq_rel, std::memory_order_acquire);
        }

        bool Get() const {
            return m_Bool.load(std::memory_order_acquire);
        }

        void Set(bool value) {
            m_Bool.store(value, std::memory_order_release);
        }

        operator bool() const {
            return Get();
        }

    private:
        std::atomic<bool> m_Bool;
    };

}
