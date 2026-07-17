#pragma once

#include "Configuration/ConfigurationManager.h"
#include "Core/Assert.h"
#include <functional>
#include <type_traits>

namespace Configuration {

    template <typename T>
    class ConfigVar : public IConfigVarBase {
    public:
        using ValidatorFunc = std::function<bool(const T&)>;

        ConfigVar(ConfigurationManager& mgr, std::string key, T defaultValue, ValidatorFunc validator = nullptr, ConfigRequirement requirement = ConfigRequirement::Optional)
            : m_Manager(mgr), m_Key(std::move(key)), m_DefaultValue(std::move(defaultValue)),
              m_CurrentValue(m_DefaultValue), m_Validator(std::move(validator)), m_Requirement(requirement)
        {
            m_Manager.RegisterVar(this);
            OnConfigReloaded(); // Initial load
        }

        ~ConfigVar() override {
            m_Manager.UnregisterVar(this);
        }

        // Fast, cached access
        const T& Get() const { return m_CurrentValue; }

        // Implicit conversion for convenience
        operator const T&() const { return m_CurrentValue; }

        const std::string& GetKey() const override { return m_Key; }

        void OnConfigReloaded() override {
            auto optVal = m_Manager.GetValue(m_Key);
            if (optVal.has_value()) {

                // --- Type Handling ---
                if constexpr (std::is_enum_v<T>) {
                    if (std::holds_alternative<Core::i32>(optVal.value())) {
                        T newVal = static_cast<T>(std::get<Core::i32>(optVal.value()));
                        if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                    } else if (std::holds_alternative<std::string>(optVal.value())) {
                         try {
                             T newVal = static_cast<T>(std::stoi(std::get<std::string>(optVal.value())));
                             if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                         } catch(...) {}
                    }
                } else if (std::holds_alternative<T>(optVal.value())) {
                    T newVal = std::get<T>(optVal.value());
                    if (m_Validator == nullptr || m_Validator(newVal)) {
                        m_CurrentValue = newVal;
                        return;
                    }
                } else if constexpr (std::is_same_v<T, std::string>) {
                     // Try convert basic types to string
                     std::string newVal;
                     bool converted = false;
                     if (std::holds_alternative<Core::i32>(optVal.value())) { newVal = std::to_string(std::get<Core::i32>(optVal.value())); converted = true; }
                     else if (std::holds_alternative<Core::f32>(optVal.value())) { newVal = std::to_string(std::get<Core::f32>(optVal.value())); converted = true; }
                     else if (std::holds_alternative<bool>(optVal.value())) { newVal = std::get<bool>(optVal.value()) ? "true" : "false"; converted = true; }

                     if (converted) {
                         if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                     }
                } else if constexpr (std::is_same_v<T, Core::i32>) {
                     // Try convert string to int
                     if (std::holds_alternative<std::string>(optVal.value())) {
                         try {
                             T newVal = std::stoi(std::get<std::string>(optVal.value()));
                             if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                         } catch(...) {}
                     }
                } else if constexpr (std::is_same_v<T, Core::f32>) {
                     // Try convert string to float
                     if (std::holds_alternative<std::string>(optVal.value())) {
                         try {
                             T newVal = std::stof(std::get<std::string>(optVal.value()));
                             if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                         } catch(...) {}
                     }
                } else if constexpr (std::is_same_v<T, bool>) {
                     // Try convert string to bool
                     if (std::holds_alternative<std::string>(optVal.value())) {
                         std::string s = std::get<std::string>(optVal.value());
                         T newVal = m_CurrentValue;
                         bool converted = false;
                         if (s == "true" || s == "True") { newVal = true; converted = true;}
                         if (s == "false" || s == "False") { newVal = false; converted = true;}
                         if (converted) {
                             if (m_Validator == nullptr || m_Validator(newVal)) { m_CurrentValue = newVal; return; }
                         }
                     }
                }
            } else {
                 // Value not found
                 if (m_Requirement == ConfigRequirement::Required) {
                     DT_ASSERT(false, "Required configuration value missing!");
                 }
                 // Fallback to default if no provider has the value
                 m_CurrentValue = m_DefaultValue;
            }
        }

    private:
        ConfigurationManager& m_Manager;
        std::string m_Key;
        T m_DefaultValue;
        T m_CurrentValue;
        ValidatorFunc m_Validator;
        ConfigRequirement m_Requirement;
    };

}
