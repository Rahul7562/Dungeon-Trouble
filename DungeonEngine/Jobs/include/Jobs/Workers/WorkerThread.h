#pragma once
#include <memory>
#include "Core/Types.h"
#include "Jobs/Queues/WorkStealingQueue.h"

namespace DungeonEngine::Jobs {

    class JobScheduler;

    class WorkerThread {
        friend class JobScheduler;
    public:
        WorkerThread(JobScheduler* scheduler, Core::u32 workerId);
        ~WorkerThread() = default;

        void Start();

        void PushLocal(IJob* job);

        std::optional<IJob*> Steal();

        Core::u32 GetWorkerId() const { return m_WorkerId; }

        size_t GetLocalQueueSize() const { return m_LocalQueue.GetSize(); }

    private:
        void Run();

        JobScheduler* m_Scheduler;
        Core::u32 m_WorkerId;
        WorkStealingQueue m_LocalQueue;

        Core::String m_ThreadName;
    };

} // namespace DungeonEngine::Jobs
