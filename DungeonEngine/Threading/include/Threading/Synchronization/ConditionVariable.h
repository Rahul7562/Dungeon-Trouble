#pragma once
#include <condition_variable>
#include "Mutex.h"

namespace DungeonEngine::Threading {

    class ConditionVariable {
    public:
        ConditionVariable() = default;
        ~ConditionVariable() = default;

        ConditionVariable(const ConditionVariable&) = delete;
        ConditionVariable& operator=(const ConditionVariable&) = delete;

        void NotifyOne() {
            m_CV.notify_one();
        }

        void NotifyAll() {
            m_CV.notify_all();
        }

        void Wait(Mutex& mutex) {
            std::unique_lock<std::mutex> lock(mutex.GetNative(), std::adopt_lock);
            m_CV.wait(lock);
            lock.release(); // release ownership without unlocking
        }

        template<typename Predicate>
        void Wait(Mutex& mutex, Predicate pred) {
            std::unique_lock<std::mutex> lock(mutex.GetNative(), std::adopt_lock);
            m_CV.wait(lock, pred);
            lock.release(); // release ownership without unlocking
        }

        // Timeout wait (returns false on timeout)
        template<typename Rep, typename Period>
        bool WaitFor(Mutex& mutex, const std::chrono::duration<Rep, Period>& rel_time) {
            std::unique_lock<std::mutex> lock(mutex.GetNative(), std::adopt_lock);
            bool res = m_CV.wait_for(lock, rel_time) == std::cv_status::no_timeout;
            lock.release();
            return res;
        }

        template<typename Rep, typename Period, typename Predicate>
        bool WaitFor(Mutex& mutex, const std::chrono::duration<Rep, Period>& rel_time, Predicate pred) {
            std::unique_lock<std::mutex> lock(mutex.GetNative(), std::adopt_lock);
            bool res = m_CV.wait_for(lock, rel_time, pred);
            lock.release();
            return res;
        }

    private:
        std::condition_variable m_CV;
    };

}
