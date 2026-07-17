#pragma once
#include "Core/Types.h"
#include <string>

namespace DungeonEngine::Window {

    enum class WindowMode {
        Windowed,
        Borderless,
        Fullscreen
    };

    struct WindowProperties {
        Core::String title = "DungeonTrouble";
        Core::u32 width = 1280;
        Core::u32 height = 720;
        Core::i32 positionX = -1; // -1 indicates centered
        Core::i32 positionY = -1; // -1 indicates centered

        WindowMode mode = WindowMode::Windowed;

        bool resizable = true;
        bool visible = true;
        bool alwaysOnTop = false;

        Core::f32 dpiScale = 1.0f;
    };
}
