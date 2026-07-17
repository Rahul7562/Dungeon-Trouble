#pragma once
#include "Core/Types.h"
#include <functional>

namespace DungeonEngine::Window {

    // These event interfaces act as stubs for future event system integration (Milestone 13)

    enum class WindowEventType {
        Created,
        Destroyed,
        Resized,
        Moved,
        FocusGained,
        FocusLost,
        Minimized,
        Maximized,
        Restored,
        Closed
    };

    struct WindowEvent {
        WindowEventType type;
        Core::u64 windowId;

        union {
            struct {
                Core::u32 width;
                Core::u32 height;
            } size;

            struct {
                Core::i32 x;
                Core::i32 y;
            } position;
        } data;
    };

    // Callback definition for event polling, using std::function to allow captures
    using WindowEventCallbackFn = std::function<void(const WindowEvent&)>;
}
