#pragma once
#include "Interfaces/IThread.h"
#include "Utilities/AtomicBool.h"
#include <thread>
#include <functional>

namespace DungeonEngine::Threading {

    class Thread : public IThread {
    public:
        // Function signature matching std::thread but potentially accepting an IThread pointer for self-reference
        using ThreadFunc = std::function<void(IThread*)>;

        explicit Thread(const Core::String& name, ThreadFunc func);
        ~Thread() override;

        // Disallow copying
        Thread(const Thread&) = delete;
        Thread& operator=(const Thread&) = delete;

        // IThread Implementation
        void Start() override;
        void Join() override;
        void Detach() override;
        void RequestStop() override;

        bool IsRunning() const override;
        bool IsJoinable() const override;
        bool StopRequested() const override;

        Core::u64 GetID() const override;
        const Core::String& GetName() const override;
        void SetName(const Core::String& name) override;

        ThreadPriority GetPriority() const override;
        void SetPriority(ThreadPriority priority) override;

        Core::u64 GetAffinity() const override;
        void SetAffinity(Core::u64 coreMask) override;

    private:
        void PlatformSetName();
        void PlatformSetPriority();
        void PlatformSetAffinity();

        Core::String m_Name;
        ThreadFunc m_Func;
        std::thread m_Thread;

        AtomicBool m_IsRunning;
        AtomicBool m_StopRequested;

        ThreadPriority m_Priority;
        Core::u64 m_AffinityMask;
    };

}
