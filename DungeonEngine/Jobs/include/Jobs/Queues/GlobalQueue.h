#pragma once
#include <queue>
#include <vector>
#include "Jobs/Interfaces/IJob.h"
#include "Threading/Synchronization/Mutex.h"

namespace DungeonEngine::Jobs {

    struct JobPriorityCompare {
        bool operator()(const IJob* lhs, const IJob* rhs) const {
            return static_cast<Core::u8>(lhs->GetPriority()) < static_cast<Core::u8>(rhs->GetPriority());
        }
    };

    class GlobalQueue {
    public:
        void Push(IJob* job) {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            m_Queue.push(job);
        }

        std::optional<IJob*> Pop() {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            if (m_Queue.empty()) {
                return std::nullopt;
            }
            IJob* job = m_Queue.top();
            m_Queue.pop();
            return job;
        }

        bool IsEmpty() const {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            return m_Queue.empty();
        }

        size_t GetSize() const {
            Threading::ScopedLock<Threading::Mutex> lock(m_Mutex);
            return m_Queue.size();
        }

    private:
        mutable Threading::Mutex m_Mutex;
        std::priority_queue<IJob*, std::vector<IJob*>, JobPriorityCompare> m_Queue;
    };

} // namespace DungeonEngine::Jobs
