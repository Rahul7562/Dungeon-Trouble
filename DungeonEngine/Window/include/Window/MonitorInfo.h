#pragma once
#include "Core/Types.h"
#include <string>

namespace DungeonEngine::Window {

    struct Rect {
        Core::i32 x;
        Core::i32 y;
        Core::i32 width;
        Core::i32 height;
    };

    struct MonitorInfo {
        Core::u32 id = 0;
        Core::String name = "Unknown Monitor";
        bool isPrimary = false;

        Core::u32 physicalWidth = 1920;
        Core::u32 physicalHeight = 1080;

        Core::u32 refreshRate = 60;

        Core::f32 dpiScaleX = 1.0f;
        Core::f32 dpiScaleY = 1.0f;

        Rect workArea;
    };
}
