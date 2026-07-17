#pragma once
#include "Mutex.h"
#include "ConditionVariable.h"
#include <atomic>

namespace DungeonEngine::Threading {

    class Event {
    public:
        Event(bool manualReset = true, bool initialState = false)
            : m_ManualReset(manualReset), m_Signaled(initialState) {}

        void Signal() {
            {
                ScopedLock<Mutex> lock(m_Mutex);
                m_Signaled = true;
            }
            if (m_ManualReset) {
                m_CV.NotifyAll();
            } else {
                m_CV.NotifyOne();
            }
        }

        void Reset() {
            ScopedLock<Mutex> lock(m_Mutex);
            m_Signaled = false;
        }

        void Wait() {
            m_Mutex.Lock();
            m_CV.Wait(m_Mutex, [this]() { return m_Signaled; });

            if (!m_ManualReset) {
                m_Signaled = false;
            }
            m_Mutex.Unlock();
        }

        bool IsSignaled() const {
            return m_Signaled;
        }

    private:
        Mutex m_Mutex;
        ConditionVariable m_CV;
        bool m_ManualReset;
        bool m_Signaled;
    };

}
