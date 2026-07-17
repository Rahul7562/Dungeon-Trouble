#pragma once
#include "Mutex.h"
#include "ConditionVariable.h"
#include "Core/Types.h"
#include "Core/Assert.h"

namespace DungeonEngine::Threading {

    // C++17 polyfill for C++20 std::latch
    class Latch {
    public:
        explicit Latch(Core::i32 count) : m_Count(count) {
            DT_ASSERT(count >= 0, "Latch count must be non-negative");
        }

        void CountDown(Core::i32 update = 1) {
            DT_ASSERT(update >= 0, "Latch update must be non-negative");
            bool shouldNotify = false;
            {
                ScopedLock<Mutex> lock(m_Mutex);
                m_Count -= update;
                DT_ASSERT(m_Count >= 0, "Latch count decreased below zero");
                if (m_Count == 0) {
                    shouldNotify = true;
                }
            }
            if (shouldNotify) {
                m_CV.NotifyAll();
            }
        }

        bool TryWait() const {
            // Need a const_cast or mutable mutex since lock changes state,
            // but for simplicity we just read it. Data races are possible if another thread is writing,
            // but since latch only counts down to 0, reading 0 is safe.
            // Better to lock it.
            ScopedLock<Mutex> lock(const_cast<Mutex&>(m_Mutex));
            return m_Count == 0;
        }

        void Wait() {
            m_Mutex.Lock();
            m_CV.Wait(m_Mutex, [this] { return m_Count == 0; });
            m_Mutex.Unlock();
        }

        void ArriveAndWait(Core::i32 update = 1) {
            CountDown(update);
            Wait();
        }

    private:
        Mutex m_Mutex;
        ConditionVariable m_CV;
        Core::i32 m_Count;
    };

}
