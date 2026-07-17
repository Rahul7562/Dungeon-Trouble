#include "Memory/LinearAllocator.h"
#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    LinearAllocator::LinearAllocator(std::size_t totalSize, void* start)
        : m_totalSize(totalSize), m_usedMemory(0), m_start(start), m_currentPos(start) {
        DT_ASSERT(start != nullptr, "Start address cannot be null");
        DT_ASSERT(totalSize > 0, "Total size must be greater than 0");
    }

    LinearAllocator::~LinearAllocator() {
        m_start = nullptr;
        m_currentPos = nullptr;
    }

    void* LinearAllocator::allocate(std::size_t size, std::size_t alignment) noexcept {
        DT_ASSERT(size > 0, "Cannot allocate 0 bytes");

        std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(m_currentPos, alignment);

        if (m_usedMemory + adjustment + size > m_totalSize) {
            // Out of memory
            return nullptr;
        }

        uintptr_t alignedAddress = reinterpret_cast<uintptr_t>(m_currentPos) + adjustment;
        m_currentPos = reinterpret_cast<void*>(alignedAddress + size);
        m_usedMemory += size + adjustment;

        return reinterpret_cast<void*>(alignedAddress);
    }

    void LinearAllocator::free(void*) noexcept {
        // Individual frees are not supported in a Linear Allocator
        // Use clear() to reset the entire allocator
    }

    void LinearAllocator::clear() noexcept {
        m_usedMemory = 0;
        m_currentPos = m_start;
    }

} // namespace DungeonEngine::Memory
