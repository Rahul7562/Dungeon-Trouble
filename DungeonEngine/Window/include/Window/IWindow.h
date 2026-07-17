#pragma once
#include "Window/WindowProperties.h"
#include "Window/WindowEvents.h"

namespace DungeonEngine::Window {

    // Opaque handle for passing to renderers (Vulkan/DirectX) without OS headers
    struct NativeWindowHandle {
        void* handle = nullptr;
        void* display = nullptr; // e.g. for X11 or Wayland display pointers
    };

    class IWindow {
    public:
        virtual ~IWindow() = default;

        // Lifecycle
        virtual bool create(const WindowProperties& props) = 0;
        virtual void destroy() = 0;

        // Visibility and Focus
        virtual void show() = 0;
        virtual void hide() = 0;
        virtual void focus() = 0;

        // State Changes
        virtual void minimize() = 0;
        virtual void maximize() = 0;
        virtual void restore() = 0;
        virtual void close() = 0;

        // Geometry
        virtual void resize(Core::u32 width, Core::u32 height) = 0;
        virtual void move(Core::i32 x, Core::i32 y) = 0;

        // Update/Poll
        virtual void pollEvents() = 0;

        // Getters
        virtual const WindowProperties& getProperties() const = 0;
        virtual Core::u64 getId() const = 0;
        virtual NativeWindowHandle getNativeHandle() const = 0;

        // Callbacks
        virtual void setEventCallback(WindowEventCallbackFn callback) = 0;
    };

}
