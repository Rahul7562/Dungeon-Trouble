#pragma once
#include "Window/IWindow.h"
#include "Window/MonitorInfo.h"
#include <memory>
#include <vector>

namespace DungeonEngine::Window {

    class WindowManager {
    public:
        WindowManager();
        ~WindowManager();

        WindowManager(const WindowManager&) = delete;
        WindowManager& operator=(const WindowManager&) = delete;

        // Window creation and management
        IWindow* createWindow(const WindowProperties& props);
        void destroyWindow(Core::u64 windowId);

        IWindow* getWindow(Core::u64 windowId) const;
        IWindow* getMainWindow() const;

        const std::vector<std::unique_ptr<IWindow>>& getAllWindows() const;

        // Update step for all windows
        void pollAllEvents();

        // Display/Monitor queries
        std::vector<MonitorInfo> getConnectedMonitors() const;
        MonitorInfo getPrimaryMonitor() const;

    private:
        struct Impl;
        std::unique_ptr<Impl> m_Impl;
    };

}
