#include "Window/WindowManager.h"
#include "Core/Assert.h"
#include <algorithm>
#include <vector>

namespace DungeonEngine::Window {

    // Forward declare the platform factories - these are defined in the WindowImpl_*.cpp files
    std::unique_ptr<IWindow> CreatePlatformWindow(Core::u64 id);
    std::vector<MonitorInfo> GetPlatformMonitors();

}

// Fallback dummy implementation if no platform matches (useful for test environments)
#if !defined(_WIN32) && !(defined(__linux__) && !defined(__ANDROID__)) && !(defined(__APPLE__) && defined(__MACH__))
namespace DungeonEngine::Window {
    class WindowImpl_Dummy : public IWindow {
    public:
        WindowImpl_Dummy(Core::u64 id) : m_Id(id) {}
        ~WindowImpl_Dummy() override { destroy(); }
        bool create(const WindowProperties& props) override { m_Properties = props; m_IsClosed = false; return true; }
        void destroy() override { m_IsClosed = true; }
        void show() override { m_Properties.visible = true; }
        void hide() override { m_Properties.visible = false; }
        void focus() override {}
        void minimize() override {}
        void maximize() override {}
        void restore() override {}
        void close() override {
            m_IsClosed = true;
            if(m_EventCallback) { WindowEvent e; e.type = WindowEventType::Closed; e.windowId = m_Id; m_EventCallback(e); }
        }
        void resize(Core::u32 width, Core::u32 height) override { m_Properties.width = width; m_Properties.height = height; }
        void move(Core::i32 x, Core::i32 y) override { m_Properties.positionX = x; m_Properties.positionY = y; }
        void pollEvents() override {}
        const WindowProperties& getProperties() const override { return m_Properties; }
        Core::u64 getId() const override { return m_Id; }
        NativeWindowHandle getNativeHandle() const override { return NativeWindowHandle{}; }
        void setEventCallback(WindowEventCallbackFn callback) override { m_EventCallback = callback; }
    private:
        Core::u64 m_Id;
        WindowProperties m_Properties;
        WindowEventCallbackFn m_EventCallback = nullptr;
        bool m_IsClosed = false;
    };

    std::unique_ptr<IWindow> CreatePlatformWindow(Core::u64 id) {
        return std::make_unique<WindowImpl_Dummy>(id);
    }

    std::vector<MonitorInfo> GetPlatformMonitors() {
        MonitorInfo mainMonitor;
        mainMonitor.id = 1;
        mainMonitor.name = "Dummy Monitor";
        mainMonitor.isPrimary = true;
        return { mainMonitor };
    }
}
#endif

namespace DungeonEngine::Window {

    struct WindowManager::Impl {
        std::vector<std::unique_ptr<IWindow>> m_Windows;
        Core::u64 m_NextWindowId = 1;
        Core::u64 m_MainWindowId = 0;
    };

    WindowManager::WindowManager() : m_Impl(std::make_unique<Impl>()) {
    }

    WindowManager::~WindowManager() {
        m_Impl->m_Windows.clear();
    }

    IWindow* WindowManager::createWindow(const WindowProperties& props) {
        Core::u64 newId = m_Impl->m_NextWindowId++;
        auto window = CreatePlatformWindow(newId);

        if (!window->create(props)) {
            return nullptr;
        }

        IWindow* windowPtr = window.get();
        m_Impl->m_Windows.push_back(std::move(window));

        if (m_Impl->m_MainWindowId == 0) {
            m_Impl->m_MainWindowId = newId;
        }

        return windowPtr;
    }

    void WindowManager::destroyWindow(Core::u64 windowId) {
        auto it = std::find_if(m_Impl->m_Windows.begin(), m_Impl->m_Windows.end(),
            [windowId](const std::unique_ptr<IWindow>& win) {
                return win->getId() == windowId;
            });

        if (it != m_Impl->m_Windows.end()) {
            (*it)->destroy();
            m_Impl->m_Windows.erase(it);

            if (m_Impl->m_MainWindowId == windowId) {
                m_Impl->m_MainWindowId = m_Impl->m_Windows.empty() ? 0 : m_Impl->m_Windows.front()->getId();
            }
        }
    }

    IWindow* WindowManager::getWindow(Core::u64 windowId) const {
        auto it = std::find_if(m_Impl->m_Windows.begin(), m_Impl->m_Windows.end(),
            [windowId](const std::unique_ptr<IWindow>& win) {
                return win->getId() == windowId;
            });

        return (it != m_Impl->m_Windows.end()) ? it->get() : nullptr;
    }

    IWindow* WindowManager::getMainWindow() const {
        if (m_Impl->m_MainWindowId == 0) return nullptr;
        return getWindow(m_Impl->m_MainWindowId);
    }

    const std::vector<std::unique_ptr<IWindow>>& WindowManager::getAllWindows() const {
        return m_Impl->m_Windows;
    }

    void WindowManager::pollAllEvents() {
        for (auto& window : m_Impl->m_Windows) {
            window->pollEvents();
        }
    }

    std::vector<MonitorInfo> WindowManager::getConnectedMonitors() const {
        return GetPlatformMonitors();
    }

    MonitorInfo WindowManager::getPrimaryMonitor() const {
        auto monitors = GetPlatformMonitors();
        for (const auto& monitor : monitors) {
            if (monitor.isPrimary) {
                return monitor;
            }
        }

        return monitors.empty() ? MonitorInfo{} : monitors.front();
    }

}
