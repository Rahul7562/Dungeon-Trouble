#include "Threading/ThreadManager.h"
#include "Core/Assert.h"
#include <thread>
#include <algorithm>
#include <vector>

namespace DungeonEngine::Threading {

    std::shared_ptr<IThread> ThreadManager::CreateThread(const Core::String& name, Thread::ThreadFunc func) {
        auto thread = std::make_shared<Thread>(name, std::move(func));

        {
            ScopedLock<Mutex> lock(m_ManagerMutex);
            m_Threads.push_back(thread);
        }

        return thread;
    }

    void ThreadManager::ShutdownAll() {
        std::vector<std::shared_ptr<IThread>> threadsToShutdown;

        // Copy the list to avoid holding the lock during joins
        {
            ScopedLock<Mutex> lock(m_ManagerMutex);
            threadsToShutdown = m_Threads;
            m_Threads.clear();
        }

        // Request stop for all threads first to allow cooperative exit
        for (auto& thread : threadsToShutdown) {
            if (thread && thread->IsRunning()) {
                thread->RequestStop();
            }
        }

        // Then join them all
        for (auto& thread : threadsToShutdown) {
            if (thread && thread->IsJoinable()) {
                thread->Join();
            }
        }
    }

    Core::u32 ThreadManager::GetLogicalCoreCount() {
        unsigned int hwConcur = std::thread::hardware_concurrency();
        return hwConcur == 0 ? 1 : hwConcur;
    }

    Core::u32 ThreadManager::GetActiveThreadCount() const {
        ScopedLock<Mutex> lock(m_ManagerMutex);
        Core::u32 count = 0;
        for (const auto& thread : m_Threads) {
            if (thread && thread->IsRunning()) {
                count++;
            }
        }
        return count;
    }

}
