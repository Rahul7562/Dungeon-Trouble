#include "Threading/Thread.h"
#include "Threading/Utilities/ThreadLocal.h"
#include "Core/Assert.h"
#include "Diagnostics/Log.h"
#include <thread>

// Platform-specific headers
#if defined(_WIN32)
    #include <windows.h>
#elif defined(__linux__) || defined(__APPLE__)
    #include <pthread.h>
#endif

namespace DungeonEngine::Threading {

    // --- ThreadContext Implementation ---

    // Thread local storage for name
    thread_local Core::String t_ThreadName = "Unknown Thread";

    void ThreadContext::SetThreadName(const Core::String& name) {
        t_ThreadName = name;
    }

    const Core::String& ThreadContext::GetThreadName() {
        return t_ThreadName;
    }


    // --- Thread Implementation ---

    Thread::Thread(const Core::String& name, ThreadFunc func)
        : m_Name(name)
        , m_Func(std::move(func))
        , m_IsRunning(false)
        , m_StopRequested(false)
        , m_Priority(ThreadPriority::Normal)
        , m_AffinityMask(0)
    {
    }

    Thread::~Thread() {
        if (IsJoinable()) {
            // Ideally we shouldn't hit this if RAII is handled by the caller,
            // but we must safely shutdown.
            RequestStop();
            Join();
        }
    }

    void Thread::Start() {
        DT_ASSERT(!m_IsRunning.Get(), "Attempted to start an already running thread");

        m_IsRunning.Set(true);
        m_StopRequested.Set(false);

        m_Thread = std::thread([this]() {
            // Thread initialization
            ThreadContext::SetThreadName(m_Name);

            // Execute function
            if (m_Func) {
                m_Func(this);
            }

            // Cleanup
            m_IsRunning.Set(false);
        });

        // Set platform configurations on the native handle
        PlatformSetName();
        PlatformSetPriority();
        PlatformSetAffinity();
    }

    void Thread::Join() {
        if (m_Thread.joinable()) {
            m_Thread.join();
        }
    }

    void Thread::Detach() {
        if (m_Thread.joinable()) {
            m_Thread.detach();
        }
    }

    void Thread::RequestStop() {
        m_StopRequested.Set(true);
    }

    bool Thread::IsRunning() const {
        return m_IsRunning.Get();
    }

    bool Thread::IsJoinable() const {
        return m_Thread.joinable();
    }

    bool Thread::StopRequested() const {
        return m_StopRequested.Get();
    }

    Core::u64 Thread::GetID() const {
        // Simple hash of standard thread id
        return std::hash<std::thread::id>{}(m_Thread.get_id());
    }

    const Core::String& Thread::GetName() const {
        return m_Name;
    }

    void Thread::SetName(const Core::String& name) {
        m_Name = name;
        if (m_IsRunning.Get()) {
            PlatformSetName();
        }
    }

    ThreadPriority Thread::GetPriority() const {
        return m_Priority;
    }

    void Thread::SetPriority(ThreadPriority priority) {
        m_Priority = priority;
        if (m_IsRunning.Get()) {
            PlatformSetPriority();
        }
    }

    Core::u64 Thread::GetAffinity() const {
        return m_AffinityMask;
    }

    void Thread::SetAffinity(Core::u64 coreMask) {
        m_AffinityMask = coreMask;
        if (m_IsRunning.Get()) {
            PlatformSetAffinity();
        }
    }

    // --- Platform implementations ---

    void Thread::PlatformSetName() {
        if (!m_Thread.joinable()) return;

#if defined(__linux__)
        pthread_setname_np(m_Thread.native_handle(), m_Name.c_str());
#elif defined(__APPLE__)
        // macOS can only set the name of the current thread, so this would need to be
        // called from inside the thread function ideally. We stub it here for native_handle.
        pthread_setname_np(m_Name.c_str());
#elif defined(_WIN32)
        // Windows 10+ SetThreadDescription
        // (requires converting to wide char, left as a stub for minimal implementation footprint)
        // HRESULT hr = SetThreadDescription(m_Thread.native_handle(), L"Name");
#endif
    }

    void Thread::PlatformSetPriority() {
        if (!m_Thread.joinable()) return;

#if defined(__linux__) || defined(__APPLE__)
        int policy;
        struct sched_param param;
        pthread_getschedparam(m_Thread.native_handle(), &policy, &param);

        // Very basic mapping
        if (m_Priority == ThreadPriority::Low) param.sched_priority = 1;
        else if (m_Priority == ThreadPriority::Normal) param.sched_priority = 10;
        else if (m_Priority == ThreadPriority::High) param.sched_priority = 20;
        else if (m_Priority == ThreadPriority::Realtime) param.sched_priority = 99;

        pthread_setschedparam(m_Thread.native_handle(), policy, &param);
#endif
    }

    void Thread::PlatformSetAffinity() {
        if (!m_Thread.joinable() || m_AffinityMask == 0) return;

#if defined(__linux__)
        cpu_set_t cpuset;
        CPU_ZERO(&cpuset);
        for (size_t j = 0; j < sizeof(m_AffinityMask) * 8; j++) {
            if (m_AffinityMask & (1ULL << j)) {
                CPU_SET(j, &cpuset);
            }
        }
        pthread_setaffinity_np(m_Thread.native_handle(), sizeof(cpu_set_t), &cpuset);
#endif
    }

}
