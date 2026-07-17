#pragma once

#include "Memory/IAllocator.h"
#include <cstdint>

namespace DungeonEngine::Memory {

    /**
     * @brief A fast, append-only memory allocator.
     * Allocations only move a pointer forward. Individual frees are not supported.
     * The entire allocator must be cleared at once via clear().
     */
    class LinearAllocator final : public IAllocator {
    public:
        /**
         * @brief Constructs a linear allocator.
         * @param totalSize The total size of the backing memory.
         * @param start A pointer to the start of the backing memory.
         */
        LinearAllocator(std::size_t totalSize, void* start);
        ~LinearAllocator() override;

        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept override;
        void free(void* ptr) noexcept override; // No-op
        void clear() noexcept override;

        std::size_t getTotalSize() const noexcept override { return m_totalSize; }
        std::size_t getUsedSize() const noexcept override { return m_usedMemory; }

    private:
        std::size_t m_totalSize;
        std::size_t m_usedMemory;
        void* m_start;
        void* m_currentPos;
    };

} // namespace DungeonEngine::Memory
