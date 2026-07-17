#pragma once

#include "Configuration/ConfigValue.h"
#include "Core/Result.h"
#include <string>
#include <unordered_map>
#include <memory>

namespace Configuration {

    using ConfigMap = std::unordered_map<std::string, ConfigValue>;

    class IConfigFormatter {
    public:
        virtual ~IConfigFormatter() = default;

        // Parse a string buffer (file contents) into a configuration map
        virtual Core::Result<ConfigMap> Parse(const std::string& data) = 0;

        // Serialize a configuration map back to a string format
        virtual Core::Result<std::string> Serialize(const ConfigMap& map) = 0;

        // Expected extension (e.g., ".ini", ".json")
        virtual std::string GetExtension() const = 0;
    };

    using ConfigFormatterPtr = std::shared_ptr<IConfigFormatter>;

}
