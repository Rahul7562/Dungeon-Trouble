#pragma once
#include "Configuration/ResultHelpers.h"

#include "Configuration/IConfigProvider.h"
#include "Configuration/IConfigFormatter.h"
#include <unordered_map>
#include <mutex>
#include <filesystem>
#include "Core/Types.h"

namespace Configuration {

    // --- Memory Provider ---
    // High priority, used for runtime overrides, profiles, or editor tweaks.
    class MemoryProvider : public IConfigProvider {
    public:
        MemoryProvider(std::string name, Core::i32 priority, std::vector<std::string> profiles = {});

        std::string GetName() const override;
        std::optional<ConfigValue> GetValue(const std::string& key) const override;
        Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value) override;
        Core::i32 GetPriority() const override;
        const std::vector<std::string>& GetProfiles() const override;

    private:
        std::string m_Name;
        Core::i32 m_Priority;
        std::vector<std::string> m_Profiles;
        mutable std::mutex m_Mutex;
        ConfigMap m_Data;
    };


    // --- Command Line Provider ---
    // Highest priority. Read-only.
    class CommandLineProvider : public IConfigProvider {
    public:
        CommandLineProvider(int argc, char** argv, std::vector<std::string> profiles = {});

        std::string GetName() const override;
        std::optional<ConfigValue> GetValue(const std::string& key) const override;
        Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value) override;
        Core::i32 GetPriority() const override;
        const std::vector<std::string>& GetProfiles() const override;

    private:
        ConfigMap m_Data;
        std::vector<std::string> m_Profiles;
    };


    // --- Environment Provider ---
    // Reads from environment variables. Prefixes keys to avoid polluting global namespace (e.g., DT_MY_KEY).
    class EnvironmentProvider : public IConfigProvider {
    public:
        EnvironmentProvider(std::string prefix = "DT_", std::vector<std::string> profiles = {});

        std::string GetName() const override;
        std::optional<ConfigValue> GetValue(const std::string& key) const override;
        Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value) override;
        Core::i32 GetPriority() const override;
        const std::vector<std::string>& GetProfiles() const override;
    private:
        std::string m_Prefix;
        std::vector<std::string> m_Profiles;
    };

    // --- File Provider ---
    // Reads/Writes from a file using a formatter.
    class FileProvider : public IConfigProvider {
    public:
        FileProvider(std::filesystem::path path, ConfigFormatterPtr formatter, Core::i32 priority, std::vector<std::string> profiles = {});

        std::string GetName() const override;
        std::optional<ConfigValue> GetValue(const std::string& key) const override;
        Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value) override;
        Core::i32 GetPriority() const override;
        const std::vector<std::string>& GetProfiles() const override;

        Configuration::VoidResult Load();
        Configuration::VoidResult Save();

    private:
        std::filesystem::path m_Path;
        ConfigFormatterPtr m_Formatter;
        Core::i32 m_Priority;
        std::vector<std::string> m_Profiles;
        mutable std::mutex m_Mutex;
        ConfigMap m_Data;
    };

}
