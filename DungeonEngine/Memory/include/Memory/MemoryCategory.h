#pragma once

#include <cstdint>

namespace DungeonEngine::Memory {

    /**
     * @brief Categories for memory allocation tagging.
     * Useful for tracking memory usage per subsystem.
     */
    enum class MemoryCategory : uint8_t {
        CORE = 0,
        MATH,
        RENDERER,
        PHYSICS,
        AUDIO,
        RESOURCES,
        NETWORKING,
        EDITOR,
        UI,
        GAMEPLAY,
        MAX_CATEGORIES // Must be last
    };

    /**
     * @brief Helper function to get string representation of a category.
     */
    constexpr const char* getCategoryName(MemoryCategory category) noexcept {
        switch (category) {
            case MemoryCategory::CORE:       return "Core";
            case MemoryCategory::MATH:       return "Math";
            case MemoryCategory::RENDERER:   return "Renderer";
            case MemoryCategory::PHYSICS:    return "Physics";
            case MemoryCategory::AUDIO:      return "Audio";
            case MemoryCategory::RESOURCES:  return "Resources";
            case MemoryCategory::NETWORKING: return "Networking";
            case MemoryCategory::EDITOR:     return "Editor";
            case MemoryCategory::UI:         return "UI";
            case MemoryCategory::GAMEPLAY:   return "Gameplay";
            default:                         return "Unknown";
        }
    }

} // namespace DungeonEngine::Memory
