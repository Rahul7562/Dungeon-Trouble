#pragma once
#include <vector>
#include <memory>
#include <optional>
#include "Core/Types.h"
#include "Jobs/Interfaces/IJob.h"
#include "Jobs/Workers/WorkerThread.h"
#include "Jobs/Queues/GlobalQueue.h"
#include "Threading/Synchronization/ConditionVariable.h"
#include "Threading/Synchronization/Mutex.h"
#include "Threading/Utilities/AtomicBool.h"
#include "Threading/Utilities/AtomicCounter.h"

namespace DungeonEngine::Threading {
    class IThread;
    class ThreadManager;
}

namespace DungeonEngine::Jobs {

    struct JobSystemStats {
        Core::u64 jobsExecuted = 0;
        size_t maxGlobalQueueDepth = 0;
        size_t currentGlobalQueueDepth = 0;
    };

    class JobScheduler {
    public:
        JobScheduler(std::shared_ptr<Threading::ThreadManager> threadManager);
        ~JobScheduler();

        JobScheduler(const JobScheduler&) = delete;
        JobScheduler& operator=(const JobScheduler&) = delete;

        void Initialize(Core::u32 workerCount = 0);

        void Shutdown();

        void Submit(IJob* job);

        bool IsShutdownRequested() const { return m_ShutdownRequested.Get(); }

        void WaitForWork();

        std::optional<IJob*> StealJob(Core::u32 requestingWorkerId);

        std::optional<IJob*> PopGlobalQueue();

        void IncrementJobsExecuted() { m_JobsExecuted++; }
        JobSystemStats GetStats() const;

    private:
        void WakeWorkers(bool wakeAll = false);

        std::shared_ptr<Threading::ThreadManager> m_ThreadManager;

        std::vector<std::unique_ptr<WorkerThread>> m_Workers;
        std::vector<std::shared_ptr<Threading::IThread>> m_WorkerThreads;

        GlobalQueue m_GlobalQueue;

        Threading::AtomicBool m_ShutdownRequested;
        std::atomic<Core::u64> m_JobsExecuted{0};

        Threading::Mutex m_WakeMutex;
        Threading::ConditionVariable m_WakeCV;
        std::atomic<Core::u32> m_ActiveWorkers{0};

        std::atomic<Core::u32> m_NextStealIndex{0};
    };

} // namespace DungeonEngine::Jobs
