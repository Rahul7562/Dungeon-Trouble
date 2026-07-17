#pragma once

#include "Memory/IAllocator.h"
#include <cstdint>

namespace DungeonEngine::Memory {

    /**
     * @brief A general-purpose free list allocator.
     * Manages a linked list of free blocks and coalesces them upon freeing.
     */
    class FreeListAllocator final : public IAllocator {
    public:
        FreeListAllocator(std::size_t totalSize, void* start);
        ~FreeListAllocator() override;

        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept override;
        void free(void* ptr) noexcept override;
        void clear() noexcept override;

        std::size_t getTotalSize() const noexcept override { return m_totalSize; }
        std::size_t getUsedSize() const noexcept override { return m_usedMemory; }

    private:
        struct AllocationHeader {
            std::size_t size;
            std::size_t adjustment;
        };

        struct FreeNode {
            std::size_t size;
            FreeNode* next;
        };

        void coalesence(FreeNode* prevBlock, FreeNode* freeBlock) noexcept;

        std::size_t m_totalSize;
        std::size_t m_usedMemory;
        void* m_start;
        FreeNode* m_freeList;
    };

} // namespace DungeonEngine::Memory
