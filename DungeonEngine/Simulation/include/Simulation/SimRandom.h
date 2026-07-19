#pragma once
#include <Core/Types.h>

namespace DungeonEngine {

class SimRandom {
public:
    explicit SimRandom(Core::u64 seed);

    Core::u32 NextUInt32();
    Core::f32 NextFloat01();
    Core::i32 NextRange(Core::i32 min, Core::i32 max); // [min, max] inclusive

private:
    Core::u64 m_state;
};

} // namespace DungeonEngine
