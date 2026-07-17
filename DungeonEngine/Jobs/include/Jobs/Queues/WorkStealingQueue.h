#pragma once
#include <deque>
#include <mutex>
#include <optional>
#include "Jobs/Interfaces/IJob.h"
#include "Threading/Synchronization/Mutex.h"

namespace DungeonEngine::Jobs {

    class WorkStealingQueue {
    public:
        WorkStealingQueue() = default;
        ~WorkStealingQueue() = default;

        void Push(IJob* job) {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            m_Deque.push_front(job);
        }

        std::optional<IJob*> Pop() {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            if (m_Deque.empty()) {
                return std::nullopt;
            }
            IJob* job = m_Deque.front();
            m_Deque.pop_front();
            return job;
        }

        std::optional<IJob*> Steal() {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            if (m_Deque.empty()) {
                return std::nullopt;
            }
            IJob* job = m_Deque.back();
            m_Deque.pop_back();
            return job;
        }

        bool IsEmpty() const {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            return m_Deque.empty();
        }

        size_t GetSize() const {
             Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
             return m_Deque.size();
        }

    private:
        mutable Threading::Mutex m_Mutex;
        std::deque<IJob*> m_Deque;
    };

} // namespace DungeonEngine::Jobs
