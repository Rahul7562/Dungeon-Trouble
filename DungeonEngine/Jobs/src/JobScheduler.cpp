#include "Jobs/Scheduler/JobScheduler.h"
#include "Threading/ThreadManager.h"
#include "Threading/Thread.h"
#include "Diagnostics/Log.h"
#include <algorithm>

namespace DungeonEngine::Jobs {

    JobScheduler::JobScheduler(std::shared_ptr<Threading::ThreadManager> threadManager)
        : m_ThreadManager(std::move(threadManager)), m_ShutdownRequested(false) {
    }

    JobScheduler::~JobScheduler() {
        if (!m_ShutdownRequested.Get()) {
            Shutdown();
        }
    }

    void JobScheduler::Initialize(Core::u32 workerCount) {
        if (workerCount == 0) {
            Core::u32 hardwareCon = Threading::ThreadManager::GetLogicalCoreCount();
            workerCount = hardwareCon > 1 ? hardwareCon - 1 : 1;
        }

        DT_LOG_INFO("JobSystem", "Initializing JobScheduler with %u workers", workerCount);

        for (Core::u32 i = 0; i < workerCount; ++i) {
            m_Workers.push_back(std::make_unique<WorkerThread>(this, i));

            auto thread = m_ThreadManager->CreateThread(
                "WorkerThread_" + std::to_string(i),
                [worker = m_Workers.back().get()](Threading::IThread*) {
                    worker->Run();
                }
            );

            thread->Start();
            m_WorkerThreads.push_back(thread);
        }

        m_ActiveWorkers.store(workerCount, std::memory_order_release);
    }

    void JobScheduler::Shutdown() {
        DT_LOG_INFO("JobSystem", "Shutting down JobScheduler");
        m_ShutdownRequested.Set(true);
        WakeWorkers(true);

        for (auto& thread : m_WorkerThreads) {
            if (thread->IsJoinable()) {
                thread->Join();
            }
        }

        m_WorkerThreads.clear();
        m_Workers.clear();
    }

    void JobScheduler::Submit(IJob* job) {
        if (job->IsReady()) {
            m_GlobalQueue.Push(job);
            WakeWorkers(false);
        }
    }

    void JobScheduler::WaitForWork() {
        Threading::ScopedLock<Threading::Mutex> lock(m_WakeMutex);

        while (!m_ShutdownRequested.Get() && m_GlobalQueue.IsEmpty()) {
            m_ActiveWorkers.fetch_sub(1, std::memory_order_acq_rel);
            m_WakeCV.Wait(m_WakeMutex);
            m_ActiveWorkers.fetch_add(1, std::memory_order_acq_rel);
        }
    }

    void JobScheduler::WakeWorkers(bool wakeAll) {
        Threading::ScopedLock<Threading::Mutex> lock(m_WakeMutex);
        if (wakeAll) {
            m_WakeCV.NotifyAll();
        } else {
            m_WakeCV.NotifyOne();
        }
    }

    std::optional<IJob*> JobScheduler::StealJob(Core::u32 requestingWorkerId) {
        if (m_Workers.size() <= 1) return std::nullopt;

        Core::u32 numWorkers = static_cast<Core::u32>(m_Workers.size());
        Core::u32 startIndex = m_NextStealIndex.fetch_add(1, std::memory_order_relaxed) % numWorkers;

        for (Core::u32 i = 0; i < numWorkers; ++i) {
            Core::u32 targetIndex = (startIndex + i) % numWorkers;
            if (targetIndex != requestingWorkerId) {
                if (auto job = m_Workers[targetIndex]->Steal()) {
                    return job;
                }
            }
        }
        return std::nullopt;
    }

    std::optional<IJob*> JobScheduler::PopGlobalQueue() {
        return m_GlobalQueue.Pop();
    }

    JobSystemStats JobScheduler::GetStats() const {
        JobSystemStats stats;
        stats.jobsExecuted = m_JobsExecuted.load(std::memory_order_relaxed);
        stats.currentGlobalQueueDepth = m_GlobalQueue.GetSize();
        stats.maxGlobalQueueDepth = stats.currentGlobalQueueDepth;
        return stats;
    }

} // namespace DungeonEngine::Jobs
