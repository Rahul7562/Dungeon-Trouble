#include "Core/Config.h"
#include <string>

namespace Core {
    void Config::SetString(const std::string& key, const std::string& value) {
        m_StringValues[key] = value;
    }

    void Config::SetInt(const std::string& key, i32 value) {
        m_IntValues[key] = value;
    }

    std::string Config::GetString(const std::string& key, const std::string& defaultValue) const {
        auto it = m_StringValues.find(key);
        if (it != m_StringValues.end()) {
            return it->second;
        }
        return defaultValue;
    }

    i32 Config::GetInt(const std::string& key, i32 defaultValue) const {
        auto it = m_IntValues.find(key);
        if (it != m_IntValues.end()) {
            return it->second;
        }
        return defaultValue;
    }
}
