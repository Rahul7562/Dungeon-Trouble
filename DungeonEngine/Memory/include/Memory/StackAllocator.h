#pragma once

#include "Memory/IAllocator.h"
#include <cstdint>

namespace DungeonEngine::Memory {

    /**
     * @brief A stack-based memory allocator.
     * Allocations happen sequentially. Frees must occur in LIFO (Last-In-First-Out) order.
     */
    class StackAllocator final : public IAllocator {
    public:
        /**
         * @brief Represents a point in the stack to which we can rollback.
         */
        using Marker = std::size_t;

        StackAllocator(std::size_t totalSize, void* start);
        ~StackAllocator() override;

        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept override;

        /**
         * @brief Frees the most recently allocated block.
         * The pointer provided MUST be the one returned by the last call to allocate.
         */
        void free(void* ptr) noexcept override;

        void clear() noexcept override;

        /**
         * @brief Gets a marker representing the current top of the stack.
         */
        Marker getMarker() const noexcept;

        /**
         * @brief Rolls back the stack to a previously obtained marker.
         */
        void freeToMarker(Marker marker) noexcept;

        std::size_t getTotalSize() const noexcept override { return m_totalSize; }
        std::size_t getUsedSize() const noexcept override { return m_usedMemory; }

    private:
        struct AllocationHeader {
            std::size_t adjustment;
#if defined(DEBUG) || !defined(NDEBUG)
            void* prevAddress;
#endif
        };

        std::size_t m_totalSize;
        std::size_t m_usedMemory;
        void* m_start;
        void* m_currentPos;

#if defined(DEBUG) || !defined(NDEBUG)
        void* m_lastAllocation;
#endif
    };

} // namespace DungeonEngine::Memory
