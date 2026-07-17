#pragma once

#include <cstdint>
#include <cstddef>
#include <atomic>

namespace DungeonEngine {
namespace Diagnostics {

class PerformanceCounters {
public:
    static void initialize();

    static void incrementFrame();
    static uint64_t getFrameCount();

    static void updateFPS(float deltaTime);
    static float getFPS();

    static void recordCPUTime(float milliseconds);
    static float getAverageCPUTime();

    // Subsystem statistics tracking
    static void addAllocatedMemory(size_t bytes);
    static void removeAllocatedMemory(size_t bytes);
    static size_t getTotalAllocatedMemory();

private:
    static std::atomic<uint64_t> s_frameCount;
    static std::atomic<float> s_currentFPS;

    static std::atomic<size_t> s_totalAllocatedMemory;
};

} // namespace Diagnostics
} // namespace DungeonEngine
