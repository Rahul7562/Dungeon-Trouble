#include "Memory/MemoryUtils.h"
#include <Core/Assert.h>

namespace DungeonEngine::Memory {

    void* MemoryUtils::alignForward(void* address, std::size_t alignment) noexcept {
        return reinterpret_cast<void*>(alignForward(reinterpret_cast<uintptr_t>(address), alignment));
    }

    uintptr_t MemoryUtils::alignForward(uintptr_t address, std::size_t alignment) noexcept {
        DT_ASSERT(isPowerOfTwo(alignment), "Alignment must be a power of two");
        return (address + (alignment - 1)) & ~(alignment - 1);
    }

    std::size_t MemoryUtils::getAlignmentAdjustment(const void* address, std::size_t alignment) noexcept {
        uintptr_t ptr = reinterpret_cast<uintptr_t>(address);
        uintptr_t alignedPtr = alignForward(ptr, alignment);
        return alignedPtr - ptr;
    }

    bool MemoryUtils::isAligned(const void* address, std::size_t alignment) noexcept {
        DT_ASSERT(isPowerOfTwo(alignment), "Alignment must be a power of two");
        return (reinterpret_cast<uintptr_t>(address) & (alignment - 1)) == 0;
    }

    void MemoryUtils::copy(void* dest, const void* src, std::size_t size) noexcept {
        if (size > 0 && dest != src) {
            std::memcpy(dest, src, size);
        }
    }

    void MemoryUtils::move(void* dest, const void* src, std::size_t size) noexcept {
        if (size > 0 && dest != src) {
            std::memmove(dest, src, size);
        }
    }

    void MemoryUtils::fill(void* dest, uint8_t value, std::size_t size) noexcept {
        if (size > 0) {
            std::memset(dest, value, size);
        }
    }

    void MemoryUtils::zero(void* dest, std::size_t size) noexcept {
        fill(dest, 0, size);
    }

} // namespace DungeonEngine::Memory
