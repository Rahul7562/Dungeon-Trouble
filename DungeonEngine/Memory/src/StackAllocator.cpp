#include "Memory/StackAllocator.h"
#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    StackAllocator::StackAllocator(std::size_t totalSize, void* start)
        : m_totalSize(totalSize), m_usedMemory(0), m_start(start), m_currentPos(start)
#if defined(DEBUG) || !defined(NDEBUG)
        , m_lastAllocation(nullptr)
#endif
    {
        DT_ASSERT(start != nullptr, "Start address cannot be null");
        DT_ASSERT(totalSize > 0, "Total size must be greater than 0");
    }

    StackAllocator::~StackAllocator() {
        m_start = nullptr;
        m_currentPos = nullptr;
    }

    void* StackAllocator::allocate(std::size_t size, std::size_t alignment) noexcept {
        DT_ASSERT(size > 0, "Cannot allocate 0 bytes");

        std::size_t requiredAlignment = alignment > alignof(AllocationHeader) ? alignment : alignof(AllocationHeader);

        // We need space for the header BEFORE the returned pointer
        std::size_t adjustment = MemoryUtils::getAlignmentAdjustment(reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(m_currentPos) + sizeof(AllocationHeader)), requiredAlignment);
        std::size_t totalAdjustment = adjustment + sizeof(AllocationHeader);

        if (m_usedMemory + totalAdjustment + size > m_totalSize) {
            return nullptr; // Out of memory
        }

        uintptr_t alignedAddress = reinterpret_cast<uintptr_t>(m_currentPos) + totalAdjustment;

        // Store header
        AllocationHeader* header = reinterpret_cast<AllocationHeader*>(alignedAddress - sizeof(AllocationHeader));
        header->adjustment = static_cast<uint8_t>(totalAdjustment);

#if defined(DEBUG) || !defined(NDEBUG)
        header->prevAddress = m_lastAllocation;
        m_lastAllocation = reinterpret_cast<void*>(alignedAddress);
#endif

        m_currentPos = reinterpret_cast<void*>(alignedAddress + size);
        m_usedMemory += size + totalAdjustment;

        return reinterpret_cast<void*>(alignedAddress);
    }

    void StackAllocator::free(void* ptr) noexcept {
        if (ptr == nullptr) return;

#if defined(DEBUG) || !defined(NDEBUG)
        DT_ASSERT(ptr == m_lastAllocation, "StackAllocator::free must be called in LIFO order");
#endif

        AllocationHeader* header = reinterpret_cast<AllocationHeader*>(reinterpret_cast<uintptr_t>(ptr) - sizeof(AllocationHeader));

#if defined(DEBUG) || !defined(NDEBUG)
        m_lastAllocation = header->prevAddress;
#endif

        std::size_t freedSize = reinterpret_cast<uintptr_t>(m_currentPos) - reinterpret_cast<uintptr_t>(ptr) + header->adjustment;
        m_currentPos = reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(ptr) - header->adjustment);
        m_usedMemory -= freedSize;
    }

    void StackAllocator::clear() noexcept {
        m_usedMemory = 0;
        m_currentPos = m_start;
#if defined(DEBUG) || !defined(NDEBUG)
        m_lastAllocation = nullptr;
#endif
    }

    StackAllocator::Marker StackAllocator::getMarker() const noexcept {
        return m_usedMemory;
    }

    void StackAllocator::freeToMarker(Marker marker) noexcept {
        DT_ASSERT(marker <= m_usedMemory, "Invalid marker");
        m_usedMemory = marker;
        m_currentPos = reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(m_start) + marker);

        // Note: In debug mode, restoring m_lastAllocation correctly to arbitrary markers
        // is complex without traversing or maintaining an explicit marker stack.
        // For this implementation, we reset it to nullptr when doing large rollbacks.
#if defined(DEBUG) || !defined(NDEBUG)
        if (marker == 0) {
            m_lastAllocation = nullptr;
        }
#endif
    }

} // namespace DungeonEngine::Memory
