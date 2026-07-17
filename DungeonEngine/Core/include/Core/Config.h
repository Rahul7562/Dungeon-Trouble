#pragma once
#include "Core/Types.h"
#include <string>
#include <unordered_map>

namespace Core {
    class Config {
    public:
        void SetString(const std::string& key, const std::string& value);
        void SetInt(const std::string& key, i32 value);

        std::string GetString(const std::string& key, const std::string& defaultValue = "") const;
        i32 GetInt(const std::string& key, i32 defaultValue = 0) const;

    private:
        std::unordered_map<std::string, std::string> m_StringValues;
        std::unordered_map<std::string, i32> m_IntValues;
    };
}
