#include "Memory/PoolAllocator.h"
#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    PoolAllocator::PoolAllocator(std::size_t blockSize, std::size_t alignment, std::size_t totalSize, void* start)
        : m_blockSize(blockSize), m_alignment(alignment), m_totalSize(totalSize), m_usedMemory(0), m_start(start), m_freeList(nullptr) {

        DT_ASSERT(blockSize >= sizeof(Node), "Block size must be large enough to hold a free list node");
        DT_ASSERT(MemoryUtils::isPowerOfTwo(alignment), "Alignment must be a power of two");

        // Ensure block size is a multiple of alignment
        std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(reinterpret_cast<void*>(blockSize), alignment);
        m_blockSize += adjustment;

        clear();
    }

    PoolAllocator::~PoolAllocator() {
        m_start = nullptr;
        m_freeList = nullptr;
    }

    void* PoolAllocator::allocate(std::size_t size, std::size_t alignment) noexcept {
        DT_ASSERT(size <= m_blockSize, "Allocation size too large for pool block");
        DT_ASSERT(alignment <= m_alignment, "Allocation alignment requirement exceeds pool alignment");

        if (m_freeList == nullptr) {
            return nullptr; // Out of memory
        }

        Node* freeNode = m_freeList;
        m_freeList = freeNode->next;
        m_usedMemory += m_blockSize;

        return reinterpret_cast<void*>(freeNode);
    }

    void PoolAllocator::free(void* ptr) noexcept {
        if (ptr == nullptr) return;

        Node* freeNode = reinterpret_cast<Node*>(ptr);
        freeNode->next = m_freeList;
        m_freeList = freeNode;
        m_usedMemory -= m_blockSize;
    }

    void PoolAllocator::clear() noexcept {
        m_usedMemory = 0;

        std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(m_start, m_alignment);
        std::size_t numBlocks = (m_totalSize - adjustment) / m_blockSize;

        if (numBlocks == 0) {
            m_freeList = nullptr;
            return;
        }

        uintptr_t currentAddress = reinterpret_cast<uintptr_t>(m_start) + adjustment;
        m_freeList = reinterpret_cast<Node*>(currentAddress);
        Node* currentNode = m_freeList;

        for (std::size_t i = 1; i < numBlocks; ++i) {
            currentAddress += m_blockSize;
            currentNode->next = reinterpret_cast<Node*>(currentAddress);
            currentNode = currentNode->next;
        }

        currentNode->next = nullptr;
    }

} // namespace DungeonEngine::Memory
