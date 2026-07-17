#pragma once
#include <vector>
#include <functional>
#include "Jobs/Interfaces/IJob.h"
#include "Jobs/Scheduler/JobScheduler.h"
#include "Jobs/Utilities/Promise.h"

namespace DungeonEngine::Jobs {

    class ParallelForJob : public IJob {
    public:
        ParallelForJob(std::function<void(Core::u32)> func, Core::u32 startIndex, Core::u32 endIndex, std::shared_ptr<std::atomic<Core::u32>> completionCounter, std::shared_ptr<Promise<void>> promise)
            : IJob("ParallelForJob", JobPriority::Normal),
              m_Func(std::move(func)), m_StartIndex(startIndex), m_EndIndex(endIndex),
              m_CompletionCounter(std::move(completionCounter)), m_Promise(std::move(promise)) {}

        void Execute() override {
            for (Core::u32 i = m_StartIndex; i < m_EndIndex; ++i) {
                m_Func(i);
            }

            if (m_CompletionCounter->fetch_sub(1, std::memory_order_acq_rel) == 1) {
                m_Promise->SetValue();
            }

            delete this;
        }

    private:
        std::function<void(Core::u32)> m_Func;
        Core::u32 m_StartIndex;
        Core::u32 m_EndIndex;
        std::shared_ptr<std::atomic<Core::u32>> m_CompletionCounter;
        std::shared_ptr<Promise<void>> m_Promise;
    };

    class ParallelFor {
    public:
        static Future<void> Execute(JobScheduler* scheduler, Core::u32 totalElements, Core::u32 batchSize, std::function<void(Core::u32)> func) {
            if (totalElements == 0) {
                Promise<void> promise;
                promise.SetValue();
                return promise.GetFuture();
            }

            Core::u32 numBatches = (totalElements + batchSize - 1) / batchSize;
            auto completionCounter = std::make_shared<std::atomic<Core::u32>>(numBatches);
            auto promise = std::make_shared<Promise<void>>();
            auto future = promise->GetFuture();

            for (Core::u32 i = 0; i < numBatches; ++i) {
                Core::u32 startIndex = i * batchSize;
                Core::u32 endIndex = std::min(startIndex + batchSize, totalElements);

                IJob* job = new ParallelForJob(func, startIndex, endIndex, completionCounter, promise);
                scheduler->Submit(job);
            }

            return future;
        }
    };

} // namespace DungeonEngine::Jobs
