#pragma once
#include "Core/Types.h"
#include <vector>

namespace DungeonEngine::Platform {

    class IProcess {
    public:
        virtual ~IProcess() = default;

        virtual void exit(Core::i32 exitCode) = 0;
        virtual bool execute(const Core::String& executablePath, const std::vector<Core::String>& arguments, Core::i32& outExitCode) = 0;
    };

}
