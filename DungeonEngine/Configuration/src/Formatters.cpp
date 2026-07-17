#include "Configuration/Formatters.h"
#include <sstream>
#include <algorithm>
#include <cctype>

namespace Configuration {

    // Helper: trim string
    static inline void ltrim(std::string &s) {
        s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) { return !std::isspace(ch); }));
    }
    static inline void rtrim(std::string &s) {
        s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) { return !std::isspace(ch); }).base(), s.end());
    }
    static inline void trim(std::string &s) {
        ltrim(s);
        rtrim(s);
    }

    // Helper: guess value type
    static ConfigValue ParseValue(const std::string& val) {
        if (val == "true" || val == "True" || val == "TRUE") return true;
        if (val == "false" || val == "False" || val == "FALSE") return false;

        // Very basic parsing to avoid exceptions which are disabled in the engine
        bool isInt = true;
        bool isFloat = false;
        bool hasSign = false;

        for (size_t i = 0; i < val.length(); ++i) {
            if (i == 0 && (val[i] == '-' || val[i] == '+')) {
                hasSign = true;
                continue;
            }
            if (val[i] == '.') {
                if (isFloat) { isInt = false; isFloat = false; break; } // multiple dots -> string
                isFloat = true;
                isInt = false;
                continue;
            }
            if (!std::isdigit(val[i])) {
                isInt = false;
                isFloat = false;
                break;
            }
        }

        if (val.empty() || (hasSign && val.length() == 1)) {
            isInt = false; isFloat = false;
        }

        if (isInt) {
            return (Core::i32)std::strtol(val.c_str(), nullptr, 10);
        } else if (isFloat) {
            return (Core::f32)std::strtof(val.c_str(), nullptr);
        }

        // Strip quotes if present
        if (val.length() >= 2 && val.front() == '"' && val.back() == '"') {
            return val.substr(1, val.length() - 2);
        }

        return val; // fallback to string
    }

    static std::string SerializeValue(const ConfigValue& val) {
        if (std::holds_alternative<Core::i32>(val)) return std::to_string(std::get<Core::i32>(val));
        if (std::holds_alternative<Core::f32>(val)) return std::to_string(std::get<Core::f32>(val));
        if (std::holds_alternative<bool>(val)) return std::get<bool>(val) ? "true" : "false";
        if (std::holds_alternative<std::string>(val)) {
            // Very naive serialization, just add quotes.
            return "\"" + std::get<std::string>(val) + "\"";
        }
        return "";
    }


    // --- IniFormatter ---
    Core::Result<ConfigMap> IniFormatter::Parse(const std::string& data) {
        ConfigMap map;
        std::istringstream stream(data);
        std::string line;
        std::string currentSection = "";

        while (std::getline(stream, line)) {
            trim(line);
            if (line.empty() || line[0] == ';' || line[0] == '#') continue;

            if (line[0] == '[' && line.back() == ']') {
                currentSection = line.substr(1, line.length() - 2);
                trim(currentSection);
            } else {
                auto delimiterPos = line.find('=');
                if (delimiterPos != std::string::npos) {
                    std::string key = line.substr(0, delimiterPos);
                    std::string valStr = line.substr(delimiterPos + 1);
                    trim(key);
                    trim(valStr);

                    std::string fullKey = currentSection.empty() ? key : currentSection + "." + key;
                    map[fullKey] = ParseValue(valStr);
                }
            }
        }
        return map;
    }

    Core::Result<std::string> IniFormatter::Serialize(const ConfigMap& map) {
        std::ostringstream out;
        for (const auto& [key, val] : map) {
             out << key << "=" << SerializeValue(val) << "\n";
        }
        return out.str();
    }


    // --- JsonFormatter (Naive Implementation) ---
    // Note: Due to no third-party rule, this is a VERY basic, flat JSON parser
    // enough for simple config files, but not a full JSON spec implementation.
    Core::Result<ConfigMap> JsonFormatter::Parse(const std::string& data) {
        ConfigMap map;
        std::istringstream stream(data);
        std::string line;

        while (std::getline(stream, line)) {
            trim(line);
            if (line.empty() || line == "{" || line == "}") continue;

            auto delimiterPos = line.find(':');
            if (delimiterPos != std::string::npos) {
                std::string key = line.substr(0, delimiterPos);
                std::string valStr = line.substr(delimiterPos + 1);
                trim(key);
                trim(valStr);

                // Strip quotes from key
                if (key.length() >= 2 && key.front() == '"' && key.back() == '"') {
                    key = key.substr(1, key.length() - 2);
                }

                // Remove trailing comma from value if present
                if (!valStr.empty() && valStr.back() == ',') {
                    valStr.pop_back();
                    trim(valStr);
                }

                map[key] = ParseValue(valStr);
            }
        }
        return map;
    }

    Core::Result<std::string> JsonFormatter::Serialize(const ConfigMap& map) {
        std::ostringstream out;
        out << "{\n";
        auto it = map.begin();
        while (it != map.end()) {
            out << "  \"" << it->first << "\": " << SerializeValue(it->second);
            auto next = it;
            ++next;
            if (next != map.end()) {
                out << ",";
            }
            out << "\n";
            it = next;
        }
        out << "}\n";
        return out.str();
    }

    // --- TomlFormatter (Naive Implementation) ---
    // TOML can be mapped roughly to INI for basic key-value and sections in our flat mapping
    Core::Result<ConfigMap> TomlFormatter::Parse(const std::string& data) {
        // For the sake of this basic config system, our INI parser is sufficient
        // to handle flat TOML configurations as well.
        IniFormatter iniParser;
        return iniParser.Parse(data);
    }

    Core::Result<std::string> TomlFormatter::Serialize(const ConfigMap& map) {
        IniFormatter iniParser;
        return iniParser.Serialize(map);
    }
}
