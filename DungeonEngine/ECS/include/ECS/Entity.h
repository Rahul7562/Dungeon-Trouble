#pragma once
#include <Core/Types.h>
#include <limits>

namespace DungeonEngine {
namespace ECS {

struct Entity {
    Core::u64 id;

    static constexpr Core::u32 INDEX_MASK = 0xFFFFFFFF;
    static constexpr Core::u32 GENERATION_MASK = 0xFFFFFFFF;
    static constexpr Core::u32 INVALID_INDEX = 0xFFFFFFFF;

    Entity() : id(INVALID_INDEX) {}
    explicit Entity(Core::u64 id) : id(id) {}
    Entity(Core::u32 index, Core::u32 generation) {
        id = (static_cast<Core::u64>(generation) << 32) | static_cast<Core::u64>(index);
    }

    Core::u32 GetIndex() const {
        return static_cast<Core::u32>(id & INDEX_MASK);
    }

    Core::u32 GetGeneration() const {
        return static_cast<Core::u32>((id >> 32) & GENERATION_MASK);
    }

    static Entity Null() {
        return Entity(INVALID_INDEX, 0);
    }

    bool operator==(const Entity& other) const {
        return id == other.id;
    }

    bool operator!=(const Entity& other) const {
        return id != other.id;
    }
};

} // namespace ECS
} // namespace DungeonEngine
