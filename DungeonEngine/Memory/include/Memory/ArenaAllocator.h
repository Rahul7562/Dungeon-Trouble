#pragma once

#include "Memory/IAllocator.h"
#include <cstdint>
#include <cstdlib> // For malloc/free

namespace DungeonEngine::Memory {

    /**
     * @brief An Arena allocator that manages large chunks of OS memory.
     * It requests large contiguous blocks from the OS (or another allocator)
     * and sub-allocates using a Linear allocator strategy.
     * This allocator is usually a backend for other allocators.
     */
    class ArenaAllocator final : public IAllocator {
    public:
        /**
         * @brief Constructs an Arena Allocator.
         * @param defaultChunkSize The default size of chunks to allocate from OS.
         */
        explicit ArenaAllocator(std::size_t defaultChunkSize);
        ~ArenaAllocator() override;

        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept override;

        /**
         * @brief Individual frees are not supported by ArenaAllocator natively.
         * It is designed to be cleared all at once.
         */
        void free(void* ptr) noexcept override;

        void clear() noexcept override;

        std::size_t getTotalSize() const noexcept override { return m_totalSize; }
        std::size_t getUsedSize() const noexcept override { return m_usedMemory; }

    private:
        struct Chunk {
            std::size_t size;
            std::size_t used;
            Chunk* next;
            uint8_t data[1]; // Flexible array member essentially
        };

        Chunk* allocateNewChunk(std::size_t size) noexcept;

        std::size_t m_defaultChunkSize;
        std::size_t m_totalSize;
        std::size_t m_usedMemory;

        Chunk* m_firstChunk;
        Chunk* m_currentChunk;
    };

} // namespace DungeonEngine::Memory
