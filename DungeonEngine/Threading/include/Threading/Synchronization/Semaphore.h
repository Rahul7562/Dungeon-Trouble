#pragma once
#include "Mutex.h"
#include "ConditionVariable.h"
#include "Core/Types.h"
#include "Core/Assert.h"

namespace DungeonEngine::Threading {

    // C++17 polyfill for C++20 std::counting_semaphore
    class Semaphore {
    public:
        Semaphore(Core::i32 count = 0) : m_Count(count) {
            DT_ASSERT(count >= 0, "Semaphore count must be non-negative");
        }

        void Release(Core::i32 update = 1) {
            DT_ASSERT(update > 0, "Semaphore update must be positive");
            {
                ScopedLock<Mutex> lock(m_Mutex);
                m_Count += update;
            }
            // If updating by 1, notify_one is more efficient. Otherwise notify_all.
            if (update == 1) {
                m_CV.NotifyOne();
            } else {
                m_CV.NotifyAll();
            }
        }

        void Acquire() {
            m_Mutex.Lock();
            m_CV.Wait(m_Mutex, [this] { return m_Count > 0; });
            --m_Count;
            m_Mutex.Unlock();
        }

        bool TryAcquire() {
            ScopedLock<Mutex> lock(m_Mutex);
            if (m_Count > 0) {
                --m_Count;
                return true;
            }
            return false;
        }

    private:
        Mutex m_Mutex;
        ConditionVariable m_CV;
        Core::i32 m_Count;
    };

}
