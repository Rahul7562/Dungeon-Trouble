#include "Diagnostics/Profiler.h"
#include "Diagnostics/Log.h"

namespace DungeonEngine {
namespace Diagnostics {

void Profiler::initialize() {
    // Placeholder for real profiler backend (e.g., Tracy)
}

void Profiler::shutdown() {
}

void Profiler::beginFrame() {
    // Record frame start
}

void Profiler::endFrame() {
    // Record frame end
}

void Profiler::beginRegion(std::string_view name) {
    // Placeholder for region start marker
}

void Profiler::endRegion() {
    // Placeholder for region end marker
}

ScopedTimer::ScopedTimer(std::string_view name) : m_name(name) {
    m_start = std::chrono::high_resolution_clock::now();
    Profiler::beginRegion(name);
}

ScopedTimer::~ScopedTimer() {
    Profiler::endRegion();
    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> duration = end - m_start;
    // We could log this if a certain threshold is met, but for now we keep it silent to avoid spam.
    // In a real implementation this hooks into a profiler backend.
    (void)duration;
}

} // namespace Diagnostics
} // namespace DungeonEngine
