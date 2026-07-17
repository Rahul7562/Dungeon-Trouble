#pragma once
#include <thread>
#include <chrono>
#include "Core/Types.h"

namespace DungeonEngine::Threading {

    class Timing {
    public:
        static void Sleep(Core::u32 milliseconds) {
            std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
        }

        static void SleepMicroseconds(Core::u32 microseconds) {
            std::this_thread::sleep_for(std::chrono::microseconds(microseconds));
        }

        static void Yield() {
            std::this_thread::yield();
        }
    };

}
