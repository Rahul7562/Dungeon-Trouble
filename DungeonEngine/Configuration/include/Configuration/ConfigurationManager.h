#pragma once

#include "Configuration/IConfigProvider.h"
#include <vector>
#include <memory>
#include <mutex>
#include <string>

namespace Configuration {

    class IConfigVarBase {
    public:
        virtual ~IConfigVarBase() = default;
        virtual void OnConfigReloaded() = 0;
        virtual const std::string& GetKey() const = 0;
    };

    class ConfigurationManager {
    public:
        ConfigurationManager();
        ~ConfigurationManager();

        // Register a new provider. Sorts providers by priority.
        void AddProvider(ConfigProviderPtr provider);

        // Set the active profile (e.g. "Development", "Release").
        void SetActiveProfile(const std::string& profile);
        const std::string& GetActiveProfile() const;

        // Fetch a value by querying providers in priority order, filtering by profile.
        std::optional<ConfigValue> GetValue(const std::string& key) const;

        // Sets a value in the highest priority provider that allows writing.
        Core::Result<bool> SetValue(const std::string& key, const ConfigValue& value);

        // Internal: Register a ConfigVar for hot-reloading updates
        void RegisterVar(IConfigVarBase* var);
        void UnregisterVar(IConfigVarBase* var);

        // Triggered when providers are reloaded or profile changes, pushes updates to all registered ConfigVars.
        void NotifyVars();

        // Reset state for testing
        void Reset();

    private:
        mutable std::mutex m_Mutex;
        std::vector<ConfigProviderPtr> m_Providers;
        std::vector<IConfigVarBase*> m_RegisteredVars;
        std::string m_ActiveProfile;

        bool ProviderMatchesProfile(const ConfigProviderPtr& provider) const;
    };

}
