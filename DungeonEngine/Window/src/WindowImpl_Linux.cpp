#include "WindowImpl_Linux.h"
#include <memory>
#include <vector>
#include "Window/MonitorInfo.h"

#if defined(__linux__) && !defined(__ANDROID__)
// Linux specific includes would go here (e.g., X11/Wayland)
#endif

namespace DungeonEngine::Window {

    WindowImpl_Linux::WindowImpl_Linux(Core::u64 id) : m_Id(id) {
    }

    WindowImpl_Linux::~WindowImpl_Linux() {
        destroy();
    }

    bool WindowImpl_Linux::create(const WindowProperties& props) {
        m_Properties = props;
        m_IsClosed = false;
        // In a real implementation, call XCreateWindow or wl_surface_create here
        return true;
    }

    void WindowImpl_Linux::destroy() {
        if (!m_IsClosed) {
            m_IsClosed = true;
        }
    }

    void WindowImpl_Linux::show() { m_Properties.visible = true; }
    void WindowImpl_Linux::hide() { m_Properties.visible = false; }
    void WindowImpl_Linux::focus() {}

    void WindowImpl_Linux::minimize() {}
    void WindowImpl_Linux::maximize() {}
    void WindowImpl_Linux::restore() {}
    void WindowImpl_Linux::close() {
        m_IsClosed = true;
        if (m_EventCallback) {
            WindowEvent e;
            e.type = WindowEventType::Closed;
            e.windowId = m_Id;
            m_EventCallback(e);
        }
    }

    void WindowImpl_Linux::resize(Core::u32 width, Core::u32 height) {
        m_Properties.width = width;
        m_Properties.height = height;
    }

    void WindowImpl_Linux::move(Core::i32 x, Core::i32 y) {
        m_Properties.positionX = x;
        m_Properties.positionY = y;
    }

    void WindowImpl_Linux::pollEvents() {
        // In a real implementation, pump XNextEvent or wl_display_dispatch here
    }

    const WindowProperties& WindowImpl_Linux::getProperties() const {
        return m_Properties;
    }

    Core::u64 WindowImpl_Linux::getId() const {
        return m_Id;
    }

    NativeWindowHandle WindowImpl_Linux::getNativeHandle() const {
        NativeWindowHandle handle;
        // handle.handle = m_XWindow;
        // handle.display = m_XDisplay;
        return handle;
    }

    void WindowImpl_Linux::setEventCallback(WindowEventCallbackFn callback) {
        m_EventCallback = callback;
    }

#if defined(__linux__) && !defined(__ANDROID__)
    std::unique_ptr<IWindow> CreatePlatformWindow(Core::u64 id) {
        return std::make_unique<WindowImpl_Linux>(id);
    }

    std::vector<MonitorInfo> GetPlatformMonitors() {
        // Stub for Linux XRandR/Wayland outputs
        MonitorInfo mainMonitor;
        mainMonitor.id = 1;
        mainMonitor.name = "Generic Monitor (Linux)";
        mainMonitor.isPrimary = true;
        return { mainMonitor };
    }
#endif

}
