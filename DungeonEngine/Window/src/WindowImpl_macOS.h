#pragma once
#include "Window/IWindow.h"

namespace DungeonEngine::Window {

    class WindowImpl_macOS : public IWindow {
    public:
        WindowImpl_macOS(Core::u64 id);
        ~WindowImpl_macOS() override;

        bool create(const WindowProperties& props) override;
        void destroy() override;

        void show() override;
        void hide() override;
        void focus() override;

        void minimize() override;
        void maximize() override;
        void restore() override;
        void close() override;

        void resize(Core::u32 width, Core::u32 height) override;
        void move(Core::i32 x, Core::i32 y) override;

        void pollEvents() override;

        const WindowProperties& getProperties() const override;
        Core::u64 getId() const override;
        NativeWindowHandle getNativeHandle() const override;

        void setEventCallback(WindowEventCallbackFn callback) override;

    private:
        Core::u64 m_Id;
        WindowProperties m_Properties;
        WindowEventCallbackFn m_EventCallback = nullptr;
        bool m_IsClosed = false;
    };

}
