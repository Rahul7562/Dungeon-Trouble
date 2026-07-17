#pragma once
#include "Core/Types.h"
#include <optional>

namespace DungeonEngine::Platform {

    class IDynamicLibrary {
    public:
        virtual ~IDynamicLibrary() = default;

        virtual bool load(const Core::String& path) = 0;
        virtual void unload() = 0;
        virtual void* getSymbol(const Core::String& symbolName) const = 0;
        virtual bool isLoaded() const = 0;
    };

}
