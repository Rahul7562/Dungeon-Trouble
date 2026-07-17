#pragma once

#include "Configuration/IConfigFormatter.h"
#include <string>

namespace Configuration {

    class IniFormatter : public IConfigFormatter {
    public:
        Core::Result<ConfigMap> Parse(const std::string& data) override;
        Core::Result<std::string> Serialize(const ConfigMap& map) override;
        std::string GetExtension() const override { return ".ini"; }
    };

    class JsonFormatter : public IConfigFormatter {
    public:
        Core::Result<ConfigMap> Parse(const std::string& data) override;
        Core::Result<std::string> Serialize(const ConfigMap& map) override;
        std::string GetExtension() const override { return ".json"; }
    };

    class TomlFormatter : public IConfigFormatter {
    public:
        Core::Result<ConfigMap> Parse(const std::string& data) override;
        Core::Result<std::string> Serialize(const ConfigMap& map) override;
        std::string GetExtension() const override { return ".toml"; }
    };
}
