#include "Simulation/SimRandom.h"

namespace DungeonEngine {

SimRandom::SimRandom(Core::u64 seed) {
    // Avoid seed of 0 for xorshift
    m_state = seed != 0 ? seed : 0x1234567890ABCDEFULL;
}

Core::u32 SimRandom::NextUInt32() {
    // XorShift64*
    m_state ^= m_state >> 12;
    m_state ^= m_state << 25;
    m_state ^= m_state >> 27;
    return static_cast<Core::u32>((m_state * 0x2545F4914F6CDD1DULL) >> 32);
}

Core::f32 SimRandom::NextFloat01() {
    return static_cast<Core::f32>(NextUInt32()) / static_cast<Core::f32>(0xFFFFFFFF);
}

Core::i32 SimRandom::NextRange(Core::i32 min, Core::i32 max) {
    if (min >= max) return min;
    Core::u32 range = static_cast<Core::u32>(max) - static_cast<Core::u32>(min) + 1;
    return min + static_cast<Core::i32>(NextUInt32() % range);
}

} // namespace DungeonEngine
