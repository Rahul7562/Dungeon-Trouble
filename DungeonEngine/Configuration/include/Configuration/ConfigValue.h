#pragma once

#include "Core/Types.h"
#include <string>
#include <variant>

namespace Configuration {

    // The canonical types supported by the configuration system.
    using ConfigValue = std::variant<std::monostate, Core::i32, Core::f32, bool, std::string>;

    enum class ConfigType {
        None,
        Int,
        Float,
        Bool,
        String
    };

    enum class ConfigRequirement {
        Optional,
        Required
    };

    inline ConfigType GetConfigType(const ConfigValue& val) {
        if (std::holds_alternative<Core::i32>(val)) return ConfigType::Int;
        if (std::holds_alternative<Core::f32>(val)) return ConfigType::Float;
        if (std::holds_alternative<bool>(val)) return ConfigType::Bool;
        if (std::holds_alternative<std::string>(val)) return ConfigType::String;
        return ConfigType::None;
    }

}
