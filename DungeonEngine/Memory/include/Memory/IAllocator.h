#pragma once

#include <cstddef>

namespace DungeonEngine::Memory {

    /**
     * @brief Abstract base class for all memory allocators.
     */
    class IAllocator {
    public:
        virtual ~IAllocator() = default;

        /**
         * @brief Allocates a block of memory.
         * @param size The size of the allocation in bytes.
         * @param alignment The required alignment in bytes.
         * @return A pointer to the allocated memory, or nullptr if allocation fails.
         */
        virtual void* allocate(std::size_t size, std::size_t alignment = sizeof(void*)) noexcept = 0;

        /**
         * @brief Frees a previously allocated block of memory.
         * @param ptr A pointer to the memory to free.
         */
        virtual void free(void* ptr) noexcept = 0;

        /**
         * @brief Clears all allocations (if supported by the allocator type).
         * Note: Some allocators might ignore this or assert if called.
         */
        virtual void clear() noexcept {}

        /**
         * @brief Gets the total size of memory managed by this allocator.
         */
        virtual std::size_t getTotalSize() const noexcept = 0;

        /**
         * @brief Gets the current amount of memory allocated.
         */
        virtual std::size_t getUsedSize() const noexcept = 0;

        // Delete copy and move semantics to prevent accidental slicing or multiple ownership
        IAllocator(const IAllocator&) = delete;
        IAllocator& operator=(const IAllocator&) = delete;
        IAllocator(IAllocator&&) = delete;
        IAllocator& operator=(IAllocator&&) = delete;

    protected:
        IAllocator() = default;
    };

} // namespace DungeonEngine::Memory
