#pragma once

#include <string_view>
#include <chrono>

namespace DungeonEngine {
namespace Diagnostics {

class Profiler {
public:
    static void initialize();
    static void shutdown();

    static void beginFrame();
    static void endFrame();

    static void beginRegion(std::string_view name);
    static void endRegion();
};

class ScopedTimer {
public:
    explicit ScopedTimer(std::string_view name);
    ~ScopedTimer();
private:
    std::string_view m_name;
    std::chrono::high_resolution_clock::time_point m_start;
};

// Convenience Macro
#define DT_PROFILE_SCOPE(name) DungeonEngine::Diagnostics::ScopedTimer timer_##__LINE__(name)

} // namespace Diagnostics
} // namespace DungeonEngine
