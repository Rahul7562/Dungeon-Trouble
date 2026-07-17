#pragma once
#include <string>
#include "Core/Types.h"
#include "Core/Result.h"

namespace DungeonEngine::Threading {

    enum class ThreadPriority {
        Low,
        Normal,
        High,
        Realtime
    };

    class IThread {
    public:
        virtual ~IThread() = default;

        // Core execution
        virtual void Start() = 0;
        virtual void Join() = 0;
        virtual void Detach() = 0;
        virtual void RequestStop() = 0;

        // State queries
        virtual bool IsRunning() const = 0;
        virtual bool IsJoinable() const = 0;
        virtual bool StopRequested() const = 0;

        // Identification
        virtual Core::u64 GetID() const = 0;
        virtual const Core::String& GetName() const = 0;
        virtual void SetName(const Core::String& name) = 0;

        // Platform features
        virtual ThreadPriority GetPriority() const = 0;
        virtual void SetPriority(ThreadPriority priority) = 0;

        virtual Core::u64 GetAffinity() const = 0;
        virtual void SetAffinity(Core::u64 coreMask) = 0;
    };

}
