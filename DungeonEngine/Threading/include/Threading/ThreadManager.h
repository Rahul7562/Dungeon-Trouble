#pragma once
#include "Thread.h"
#include "Synchronization/Mutex.h"
#include <vector>
#include <memory>
#include <unordered_map>

namespace DungeonEngine::Threading {

    // Responsible for global tracking and shutdown coordination of threads.
    class ThreadManager {
    public:
        // Returns a pointer to a newly created and registered thread
        std::shared_ptr<IThread> CreateThread(const Core::String& name, Thread::ThreadFunc func);

        // Requests all registered threads to stop and waits for them to join
        void ShutdownAll();

        // Get hardware concurrency info
        static Core::u32 GetLogicalCoreCount();

        // Used primarily for diagnostics/statistics
        Core::u32 GetActiveThreadCount() const;

    private:
        mutable Mutex m_ManagerMutex;
        std::vector<std::shared_ptr<IThread>> m_Threads;
    };

}
