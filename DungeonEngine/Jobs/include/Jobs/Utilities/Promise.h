#pragma once
#include "Future.h"

namespace DungeonEngine::Jobs {

    template<typename T>
    class Promise {
    public:
        Promise() : m_State(std::make_shared<SharedState<T>>()) {}

        Future<T> GetFuture() const {
            return Future<T>(m_State);
        }

        void SetValue(T value) {
            DT_ASSERT(m_State != nullptr, "Setting value on invalid Promise");
            m_State->value = std::move(value);
            m_State->ready.store(true, std::memory_order_release);
            m_State->event.Signal();
        }

    private:
        std::shared_ptr<SharedState<T>> m_State;
    };

    template<>
    class Promise<void> {
    public:
        Promise() : m_State(std::make_shared<SharedState<void>>()) {}

        Future<void> GetFuture() const {
            return Future<void>(m_State);
        }

        void SetValue() {
            DT_ASSERT(m_State != nullptr, "Setting value on invalid Promise");
            m_State->ready.store(true, std::memory_order_release);
            m_State->event.Signal();
        }

    private:
        std::shared_ptr<SharedState<void>> m_State;
    };

} // namespace DungeonEngine::Jobs
