#pragma once

#include "Configuration/ConfigValue.h"
#include "Core/Result.h"
#include "Core/Types.h"
#include <string>
#include <vector>
#include <memory>
#include <optional>

namespace Configuration {

    class IConfigProvider {
    public:
        virtual ~IConfigProvider() = default;

        // Get the name/identifier of this provider (e.g., "CommandLine", "UserConfig.ini")
        virtual std::string GetName() const = 0;

        // Try to get a value. Returns nullopt if the key doesn't exist in this provider.
        virtual std::optional<ConfigValue> GetValue(const std::string& key) const = 0;

        // Set a value. Returns success if the provider allows writing, error otherwise.
        virtual Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value) = 0;

        // Priority for layering. Higher number means higher priority.
        virtual Core::i32 GetPriority() const = 0;

        // Profiles this provider belongs to. Empty means all profiles.
        virtual const std::vector<std::string>& GetProfiles() const = 0;
    };

    using ConfigProviderPtr = std::shared_ptr<IConfigProvider>;

}
