#include "Configuration/ConfigurationManager.h"
#include <algorithm>

namespace Configuration {

    ConfigurationManager::ConfigurationManager() {}
    ConfigurationManager::~ConfigurationManager() {}

    void ConfigurationManager::AddProvider(ConfigProviderPtr provider) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Providers.push_back(std::move(provider));

        // Sort highest priority first
        std::sort(m_Providers.begin(), m_Providers.end(), [](const ConfigProviderPtr& a, const ConfigProviderPtr& b) {
            return a->GetPriority() > b->GetPriority();
        });
    }

    void ConfigurationManager::SetActiveProfile(const std::string& profile) {
        {
            std::lock_guard<std::mutex> lock(m_Mutex);
            m_ActiveProfile = profile;
        }
        NotifyVars();
    }

    const std::string& ConfigurationManager::GetActiveProfile() const {
        std::lock_guard<std::mutex> lock(m_Mutex);
        return m_ActiveProfile;
    }

    bool ConfigurationManager::ProviderMatchesProfile(const ConfigProviderPtr& provider) const {
        const auto& profiles = provider->GetProfiles();
        if (profiles.empty()) return true; // Empty means applies to all profiles

        return std::find(profiles.begin(), profiles.end(), m_ActiveProfile) != profiles.end();
    }

    std::optional<ConfigValue> ConfigurationManager::GetValue(const std::string& key) const {
        std::lock_guard<std::mutex> lock(m_Mutex);
        for (const auto& provider : m_Providers) {
            if (ProviderMatchesProfile(provider)) {
                auto val = provider->GetValue(key);
                if (val.has_value()) {
                    return val;
                }
            }
        }
        return std::nullopt;
    }

    Core::Result<bool> ConfigurationManager::SetValue(const std::string& key, const ConfigValue& value) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        for (const auto& provider : m_Providers) {
            if (ProviderMatchesProfile(provider)) {
                auto result = provider->SetValue(key, value);
                if (result.IsOk()) {
                    return true;
                }
            }
        }
        return Core::Result<bool>::Error("No valid provider accepted the value for current profile");
    }

    void ConfigurationManager::RegisterVar(IConfigVarBase* var) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_RegisteredVars.push_back(var);
    }

    void ConfigurationManager::UnregisterVar(IConfigVarBase* var) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_RegisteredVars.erase(std::remove(m_RegisteredVars.begin(), m_RegisteredVars.end(), var), m_RegisteredVars.end());
    }

    void ConfigurationManager::NotifyVars() {
        std::vector<IConfigVarBase*> varsToNotify;
        {
            std::lock_guard<std::mutex> lock(m_Mutex);
            varsToNotify = m_RegisteredVars;
        }

        for (auto var : varsToNotify) {
            var->OnConfigReloaded();
        }
    }

    void ConfigurationManager::Reset() {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Providers.clear();
        m_RegisteredVars.clear();
        m_ActiveProfile.clear();
    }

}
