#pragma once
#include <atomic>
#include "Core/Types.h"
#include "Core/Result.h"

namespace DungeonEngine::Jobs {

    enum class JobPriority : Core::u8 {
        Low,
        Normal,
        High,
        Critical
    };

    class IJob {
    public:
        virtual ~IJob() = default;

        virtual void Execute() = 0;

        void AddDependency() {
            m_UnfinishedDependencies.fetch_add(1, std::memory_order_relaxed);
        }

        void RemoveDependency() {
            m_UnfinishedDependencies.fetch_sub(1, std::memory_order_release);
        }

        Core::i32 GetUnfinishedDependencies() const {
            return m_UnfinishedDependencies.load(std::memory_order_acquire);
        }

        bool IsReady() const {
            return GetUnfinishedDependencies() == 0;
        }

        JobPriority GetPriority() const { return m_Priority; }
        void SetPriority(JobPriority priority) { m_Priority = priority; }

        const Core::String& GetName() const { return m_Name; }
        void SetName(const Core::String& name) { m_Name = name; }

    protected:
        IJob(const Core::String& name = "UnnamedJob", JobPriority priority = JobPriority::Normal)
            : m_Name(name), m_Priority(priority), m_UnfinishedDependencies(0) {}

    private:
        Core::String m_Name;
        JobPriority m_Priority;
        std::atomic<Core::i32> m_UnfinishedDependencies;
    };

} // namespace DungeonEngine::Jobs
