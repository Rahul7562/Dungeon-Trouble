#pragma once

#include "Memory/IAllocator.h"
#include <cstdint>

namespace DungeonEngine::Memory {

    /**
     * @brief A memory pool allocator.
     * Allocates fixed-size blocks of memory in O(1) time.
     * Frees memory in O(1) time.
     */
    class PoolAllocator final : public IAllocator {
    public:
        /**
         * @brief Constructs a pool allocator.
         * @param blockSize The size of each block in the pool.
         * @param alignment The alignment requirement for each block.
         * @param totalSize The total size of the backing memory.
         * @param start A pointer to the start of the backing memory.
         */
        PoolAllocator(std::size_t blockSize, std::size_t alignment, std::size_t totalSize, void* start);
        ~PoolAllocator() override;

        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept override;
        void free(void* ptr) noexcept override;
        void clear() noexcept override;

        std::size_t getTotalSize() const noexcept override { return m_totalSize; }
        std::size_t getUsedSize() const noexcept override { return m_usedMemory; }

    private:
        struct Node {
            Node* next;
        };

        std::size_t m_blockSize;
        std::size_t m_alignment;
        std::size_t m_totalSize;
        std::size_t m_usedMemory;
        void* m_start;
        Node* m_freeList;
    };

} // namespace DungeonEngine::Memory
