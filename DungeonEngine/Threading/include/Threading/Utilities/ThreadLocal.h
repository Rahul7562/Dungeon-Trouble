#pragma once
#include <string>
#include "Core/Types.h"

namespace DungeonEngine::Threading {

    // Global utility to get/set current thread context information
    class ThreadContext {
    public:
        static void SetThreadName(const Core::String& name);
        static const Core::String& GetThreadName();

        // This can be expanded to hold diagnostic identifiers, job system contexts, etc.
    };

}
