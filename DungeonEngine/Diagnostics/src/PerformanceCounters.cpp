#include "Diagnostics/PerformanceCounters.h"
#include <atomic>

namespace DungeonEngine {
namespace Diagnostics {

std::atomic<uint64_t> PerformanceCounters::s_frameCount{0};
std::atomic<float> PerformanceCounters::s_currentFPS{0.0f};
std::atomic<size_t> PerformanceCounters::s_totalAllocatedMemory{0};

void PerformanceCounters::initialize() {
    s_frameCount = 0;
    s_currentFPS = 0.0f;
    s_totalAllocatedMemory = 0;
}

void PerformanceCounters::incrementFrame() {
    s_frameCount++;
}

uint64_t PerformanceCounters::getFrameCount() {
    return s_frameCount.load();
}

void PerformanceCounters::updateFPS(float deltaTime) {
    if (deltaTime > 0.0f) {
        // Simple smoothing for FPS calculation
        float newFPS = 1.0f / deltaTime;
        float current = s_currentFPS.load();
        float smoothed = (current == 0.0f) ? newFPS : (current * 0.9f + newFPS * 0.1f);
        s_currentFPS.store(smoothed);
    }
}

float PerformanceCounters::getFPS() {
    return s_currentFPS.load();
}

void PerformanceCounters::recordCPUTime(float milliseconds) {
    (void)milliseconds;
    // To be implemented fully with rolling averages
}

float PerformanceCounters::getAverageCPUTime() {
    return 0.0f; // Placeholder
}

void PerformanceCounters::addAllocatedMemory(size_t bytes) {
    s_totalAllocatedMemory.fetch_add(bytes, std::memory_order_relaxed);
}

void PerformanceCounters::removeAllocatedMemory(size_t bytes) {
    s_totalAllocatedMemory.fetch_sub(bytes, std::memory_order_relaxed);
}

size_t PerformanceCounters::getTotalAllocatedMemory() {
    return s_totalAllocatedMemory.load(std::memory_order_relaxed);
}

} // namespace Diagnostics
} // namespace DungeonEngine
