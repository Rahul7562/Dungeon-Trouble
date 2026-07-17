#include "Memory/ArenaAllocator.h"
#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    ArenaAllocator::ArenaAllocator(std::size_t defaultChunkSize)
        : m_defaultChunkSize(defaultChunkSize), m_totalSize(0), m_usedMemory(0),
          m_firstChunk(nullptr), m_currentChunk(nullptr) {
        DT_ASSERT(defaultChunkSize > 0, "Default chunk size must be greater than 0");
    }

    ArenaAllocator::~ArenaAllocator() {
        Chunk* current = m_firstChunk;
        while (current != nullptr) {
            Chunk* next = current->next;
            std::free(current);
            current = next;
        }
    }

    ArenaAllocator::Chunk* ArenaAllocator::allocateNewChunk(std::size_t size) noexcept {
        std::size_t chunkSize = size > m_defaultChunkSize ? size : m_defaultChunkSize;
        std::size_t totalAllocSize = sizeof(Chunk) - 1 + chunkSize; // -1 for data[1]

        void* mem = std::malloc(totalAllocSize);
        if (!mem) return nullptr;

        Chunk* chunk = reinterpret_cast<Chunk*>(mem);
        chunk->size = chunkSize;
        chunk->used = 0;
        chunk->next = nullptr;

        m_totalSize += chunkSize;

        return chunk;
    }

    void* ArenaAllocator::allocate(std::size_t size, std::size_t alignment) noexcept {
        DT_ASSERT(size > 0, "Cannot allocate 0 bytes");

        if (m_currentChunk == nullptr) {
            m_firstChunk = allocateNewChunk(size);
            m_currentChunk = m_firstChunk;
            if (!m_currentChunk) return nullptr; // OOM
        }

        // Try to allocate in current chunk
        void* currentPos = &m_currentChunk->data[m_currentChunk->used];
        std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(currentPos, alignment);

        if (m_currentChunk->used + adjustment + size > m_currentChunk->size) {
            // Need a new chunk
            Chunk* newChunk = allocateNewChunk(size + alignment);
            if (!newChunk) return nullptr; // OOM

            m_currentChunk->next = newChunk;
            m_currentChunk = newChunk;

            currentPos = &m_currentChunk->data[0];
            adjustment = MemoryUtils::getAlignmentAdjustment(currentPos, alignment);
        }

        uintptr_t alignedAddress = reinterpret_cast<uintptr_t>(currentPos) + adjustment;
        m_currentChunk->used += adjustment + size;
        m_usedMemory += size + adjustment;

        return reinterpret_cast<void*>(alignedAddress);
    }

    void ArenaAllocator::free(void*) noexcept {
        // Individual frees are not supported by ArenaAllocator
    }

    void ArenaAllocator::clear() noexcept {
        m_usedMemory = 0;
        m_currentChunk = m_firstChunk;

        Chunk* current = m_firstChunk;
        while (current != nullptr) {
            current->used = 0;
            current = current->next;
        }
    }

} // namespace DungeonEngine::Memory
