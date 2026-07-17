#include "Jobs/Workers/WorkerThread.h"
#include "Jobs/Scheduler/JobScheduler.h"
#include "Threading/ThreadManager.h"
#include "Threading/Utilities/ThreadLocal.h"
#include "Diagnostics/Log.h"

namespace DungeonEngine::Jobs {

    WorkerThread::WorkerThread(JobScheduler* scheduler, Core::u32 workerId)
        : m_Scheduler(scheduler), m_WorkerId(workerId) {
        m_ThreadName = "WorkerThread_" + std::to_string(m_WorkerId);
    }

    void WorkerThread::Start() {
    }

    void WorkerThread::PushLocal(IJob* job) {
        m_LocalQueue.Push(job);
    }

    std::optional<IJob*> WorkerThread::Steal() {
        return m_LocalQueue.Steal();
    }

    void WorkerThread::Run() {
        Threading::ThreadContext::SetThreadName(m_ThreadName);
        DT_LOG_TRACE("JobSystem", "Worker %u started.", m_WorkerId);

        while (!m_Scheduler->IsShutdownRequested()) {
            IJob* jobToExecute = nullptr;

            if (auto job = m_LocalQueue.Pop()) {
                jobToExecute = *job;
            }
            else if (auto stolenJob = m_Scheduler->StealJob(m_WorkerId)) {
                jobToExecute = *stolenJob;
            }
            else if (auto globalJob = m_Scheduler->PopGlobalQueue()) {
                jobToExecute = *globalJob;
            }

            if (jobToExecute) {
                jobToExecute->Execute();
                m_Scheduler->IncrementJobsExecuted();
            } else {
                m_Scheduler->WaitForWork();
            }
        }

        DT_LOG_TRACE("JobSystem", "Worker %u shutting down.", m_WorkerId);
    }

} // namespace DungeonEngine::Jobs
