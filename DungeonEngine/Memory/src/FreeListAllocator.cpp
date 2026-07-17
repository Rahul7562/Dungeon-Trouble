#include "Memory/FreeListAllocator.h"
#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    FreeListAllocator::FreeListAllocator(std::size_t totalSize, void* start)
        : m_totalSize(totalSize), m_usedMemory(0), m_start(start), m_freeList(nullptr) {
        DT_ASSERT(start != nullptr, "Start address cannot be null");
        DT_ASSERT(totalSize > sizeof(FreeNode), "Total size too small");
        clear();
    }

    FreeListAllocator::~FreeListAllocator() {
        m_start = nullptr;
        m_freeList = nullptr;
    }

    void* FreeListAllocator::allocate(std::size_t size, std::size_t alignment) noexcept {
        DT_ASSERT(size != 0, "Allocation size cannot be 0");
        DT_ASSERT(MemoryUtils::isPowerOfTwo(alignment), "Alignment must be a power of two");

        // Ensure minimum allocation size to hold FreeNode when freed
        if (size < sizeof(FreeNode)) {
            size = sizeof(FreeNode);
        }

        std::size_t requiredAlignment = alignment > alignof(AllocationHeader) ? alignment : alignof(AllocationHeader);

        FreeNode* prevBlock = nullptr;
        FreeNode* currBlock = m_freeList;

        while (currBlock != nullptr) {
            // Check if block has enough space
            std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(currBlock) + sizeof(AllocationHeader)), requiredAlignment);
            std::size_t totalSize = size + adjustment + sizeof(AllocationHeader);

            if (currBlock->size >= totalSize) {
                // Found a suitable block
                std::size_t remainingSize = currBlock->size - totalSize;

                FreeNode* nextBlock = currBlock->next;

                if (remainingSize > sizeof(FreeNode)) {
                    // Split the block
                    FreeNode* newFreeBlock = reinterpret_cast<FreeNode*>(reinterpret_cast<uintptr_t>(currBlock) + totalSize);
                    newFreeBlock->size = remainingSize;
                    newFreeBlock->next = currBlock->next;
                    nextBlock = newFreeBlock;
                } else {
                    // Don't split, give the whole block
                    totalSize = currBlock->size;
                }

                if (prevBlock == nullptr) {
                    m_freeList = nextBlock;
                } else {
                    prevBlock->next = nextBlock;
                }

                uintptr_t alignedAddress = reinterpret_cast<uintptr_t>(currBlock) + totalSize - size; // Using end of block for simplicity to preserve header adjustment logic

                // Simpler approach: place header just before aligned address
                alignedAddress = reinterpret_cast<uintptr_t>(currBlock) + adjustment + sizeof(AllocationHeader);

                AllocationHeader* header = reinterpret_cast<AllocationHeader*>(alignedAddress - sizeof(AllocationHeader));
                header->size = totalSize;
                header->adjustment = static_cast<uint8_t>(adjustment + sizeof(AllocationHeader));

                m_usedMemory += totalSize;

                return reinterpret_cast<void*>(alignedAddress);
            }

            prevBlock = currBlock;
            currBlock = currBlock->next;
        }

        return nullptr; // Out of memory
    }

    void FreeListAllocator::free(void* ptr) noexcept {
        if (ptr == nullptr) return;

        AllocationHeader* header = reinterpret_cast<AllocationHeader*>(reinterpret_cast<uintptr_t>(ptr) - sizeof(AllocationHeader));

        uintptr_t blockStart = reinterpret_cast<uintptr_t>(ptr) - header->adjustment;
        std::size_t blockSize = header->size;

        m_usedMemory -= blockSize;

        FreeNode* newFreeBlock = reinterpret_cast<FreeNode*>(blockStart);
        newFreeBlock->size = blockSize;
        newFreeBlock->next = nullptr;

        // Insert into free list, sorted by address
        FreeNode* prevBlock = nullptr;
        FreeNode* currBlock = m_freeList;

        while (currBlock != nullptr && currBlock < newFreeBlock) {
            prevBlock = currBlock;
            currBlock = currBlock->next;
        }

        if (prevBlock == nullptr) {
            newFreeBlock->next = m_freeList;
            m_freeList = newFreeBlock;
        } else {
            prevBlock->next = newFreeBlock;
            newFreeBlock->next = currBlock;
        }

        coalesence(prevBlock, newFreeBlock);
    }

    void FreeListAllocator::coalesence(FreeNode* prevBlock, FreeNode* freeBlock) noexcept {
        // Coalesce with next block if adjacent
        if (freeBlock->next != nullptr &&
            reinterpret_cast<uintptr_t>(freeBlock) + freeBlock->size == reinterpret_cast<uintptr_t>(freeBlock->next)) {

            freeBlock->size += freeBlock->next->size;
            freeBlock->next = freeBlock->next->next;
        }

        // Coalesce with previous block if adjacent
        if (prevBlock != nullptr &&
            reinterpret_cast<uintptr_t>(prevBlock) + prevBlock->size == reinterpret_cast<uintptr_t>(freeBlock)) {

            prevBlock->size += freeBlock->size;
            prevBlock->next = freeBlock->next;
        }
    }

    void FreeListAllocator::clear() noexcept {
        m_usedMemory = 0;
        m_freeList = reinterpret_cast<FreeNode*>(m_start);
        m_freeList->size = m_totalSize;
        m_freeList->next = nullptr;
    }

} // namespace DungeonEngine::Memory
