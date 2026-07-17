#pragma once
#include "Core/Types.h"
#include <optional>

namespace DungeonEngine::Platform {

    class IEnvironment {
    public:
        virtual ~IEnvironment() = default;

        virtual Core::String getExecutableDirectory() const = 0;
        virtual Core::String getWorkingDirectory() const = 0;
        virtual Core::String getUserHomeDirectory() const = 0;
        virtual Core::String getTemporaryDirectory() const = 0;
        virtual Core::String getApplicationDataDirectory() const = 0;

        virtual std::optional<Core::String> getEnvironmentVariable(const Core::String& name) const = 0;
        virtual bool setEnvironmentVariable(const Core::String& name, const Core::String& value) = 0;
    };

}
