#include "Configuration/Providers.h"
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace Configuration {

    // --- Memory Provider ---
    MemoryProvider::MemoryProvider(std::string name, Core::i32 priority, std::vector<std::string> profiles)
        : m_Name(std::move(name)), m_Priority(priority), m_Profiles(std::move(profiles)) {}

    std::string MemoryProvider::GetName() const { return m_Name; }

    std::optional<ConfigValue> MemoryProvider::GetValue(const std::string& key) const {
        std::lock_guard<std::mutex> lock(m_Mutex);
        auto it = m_Data.find(key);
        if (it != m_Data.end()) return it->second;
        return std::nullopt;
    }

    Core::Result<bool> MemoryProvider::SetValue(const std::string& key, const ConfigValue& value) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Data[key] = value;
        return true;
    }

    Core::i32 MemoryProvider::GetPriority() const { return m_Priority; }

    const std::vector<std::string>& MemoryProvider::GetProfiles() const { return m_Profiles; }


    // --- Command Line Provider ---
    CommandLineProvider::CommandLineProvider(int argc, char** argv, std::vector<std::string> profiles) : m_Profiles(std::move(profiles)) {
        for (int i = 1; i < argc; ++i) {
            std::string arg = argv[i];
            // Support formats like --key=value or -key value
            if (arg.length() > 2 && arg.substr(0, 2) == "--") {
                auto eqPos = arg.find('=');
                if (eqPos != std::string::npos) {
                    std::string key = arg.substr(2, eqPos - 2);
                    std::string valStr = arg.substr(eqPos + 1);
                    // Minimal parsing for ints/bools if necessary, but keep it string for now
                    m_Data[key] = valStr;
                }
            }
        }
    }

    std::string CommandLineProvider::GetName() const { return "CommandLine"; }

    std::optional<ConfigValue> CommandLineProvider::GetValue(const std::string& key) const {
        auto it = m_Data.find(key);
        if (it != m_Data.end()) return it->second;
        return std::nullopt;
    }

    Core::Result<bool> CommandLineProvider::SetValue(const std::string& key, const ConfigValue& value) {
        return Core::Result<bool>::Error("CommandLineProvider is read-only.");
    }

    Core::i32 CommandLineProvider::GetPriority() const { return 1000; } // Highest priority
    const std::vector<std::string>& CommandLineProvider::GetProfiles() const { return m_Profiles; }


    // --- Environment Provider ---
    EnvironmentProvider::EnvironmentProvider(std::string prefix, std::vector<std::string> profiles) : m_Prefix(std::move(prefix)), m_Profiles(std::move(profiles)) {}

    std::string EnvironmentProvider::GetName() const { return "Environment"; }

    std::optional<ConfigValue> EnvironmentProvider::GetValue(const std::string& key) const {
        std::string envKey = m_Prefix + key;
        // Transform to uppercase and replace dots with underscores for typical env var formatting
        std::replace(envKey.begin(), envKey.end(), '.', '_');
        for (auto& c : envKey) c = std::toupper(static_cast<unsigned char>(c));

        if (const char* env_p = std::getenv(envKey.c_str())) {
            return std::string(env_p);
        }
        return std::nullopt;
    }

    Core::Result<bool> EnvironmentProvider::SetValue(const std::string& key, const ConfigValue& value) {
         return Core::Result<bool>::Error("EnvironmentProvider is read-only.");
    }

    Core::i32 EnvironmentProvider::GetPriority() const { return 900; }
    const std::vector<std::string>& EnvironmentProvider::GetProfiles() const { return m_Profiles; }


    // --- File Provider ---
    FileProvider::FileProvider(std::filesystem::path path, ConfigFormatterPtr formatter, Core::i32 priority, std::vector<std::string> profiles)
        : m_Path(std::move(path)), m_Formatter(std::move(formatter)), m_Priority(priority), m_Profiles(std::move(profiles)) {}

    std::string FileProvider::GetName() const { return m_Path.filename().string(); }

    std::optional<ConfigValue> FileProvider::GetValue(const std::string& key) const {
        std::lock_guard<std::mutex> lock(m_Mutex);
        auto it = m_Data.find(key);
        if (it != m_Data.end()) return it->second;
        return std::nullopt;
    }

    Core::Result<bool> FileProvider::SetValue(const std::string& key, const ConfigValue& value) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Data[key] = value;
        return true;
    }

    Core::i32 FileProvider::GetPriority() const { return m_Priority; }
    const std::vector<std::string>& FileProvider::GetProfiles() const { return m_Profiles; }

    Configuration::VoidResult FileProvider::Load() {
        std::ifstream file(m_Path);
        if (!file.is_open()) {
             return Configuration::VoidResult::Error("Failed to open file: " + m_Path.string());
        }

        std::stringstream buffer;
        buffer << file.rdbuf();

        auto parseResult = m_Formatter->Parse(buffer.str());
        if (parseResult.IsError()) {
            return Configuration::VoidResult::Error(parseResult.GetError());
        }

        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Data = parseResult.Get();

        return Configuration::MakeSuccess();
    }

    Configuration::VoidResult FileProvider::Save() {
        std::lock_guard<std::mutex> lock(m_Mutex);
        auto serializeResult = m_Formatter->Serialize(m_Data);
        if (serializeResult.IsError()) {
            return Configuration::VoidResult::Error(serializeResult.GetError());
        }

        std::ofstream file(m_Path);
        if (!file.is_open()) {
             return Configuration::VoidResult::Error("Failed to open file for writing: " + m_Path.string());
        }

        file << serializeResult.Get();
        return Configuration::MakeSuccess();
    }

}
