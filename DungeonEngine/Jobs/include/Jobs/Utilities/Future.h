#pragma once
#include <memory>
#include <optional>
#include "Threading/Synchronization/Event.h"
#include "Core/Assert.h"
#include "Core/Result.h"

namespace DungeonEngine::Jobs {

    template<typename T>
    struct SharedState {
        Threading::Event event;
        std::optional<T> value;
        std::atomic<bool> ready{false};

        SharedState() : event(true, false) {}
    };

    template<>
    struct SharedState<void> {
        Threading::Event event;
        std::atomic<bool> ready{false};

        SharedState() : event(true, false) {}
    };


    template<typename T>
    class Promise;

    template<typename T>
    class Future {
    public:
        Future() = default;

        Future(std::shared_ptr<SharedState<T>> state) : m_State(std::move(state)) {}

        void Wait() const {
            DT_ASSERT(m_State != nullptr, "Waiting on an invalid Future");
            if (!m_State->ready.load(std::memory_order_acquire)) {
                m_State->event.Wait();
            }
        }

        bool IsReady() const {
            if (!m_State) return false;
            return m_State->ready.load(std::memory_order_acquire);
        }

        T Get() {
            Wait();
            DT_ASSERT(m_State->value.has_value(), "Future state does not have a value");
            return std::move(m_State->value.value());
        }

    private:
        std::shared_ptr<SharedState<T>> m_State;
    };

    template<>
    class Future<void> {
    public:
        Future() = default;

        Future(std::shared_ptr<SharedState<void>> state) : m_State(std::move(state)) {}

        void Wait() const {
            DT_ASSERT(m_State != nullptr, "Waiting on an invalid Future");
            if (!m_State->ready.load(std::memory_order_acquire)) {
                m_State->event.Wait();
            }
        }

        bool IsReady() const {
            if (!m_State) return false;
            return m_State->ready.load(std::memory_order_acquire);
        }

        void Get() {
            Wait();
        }

    private:
        std::shared_ptr<SharedState<void>> m_State;
    };
} // namespace DungeonEngine::Jobs
