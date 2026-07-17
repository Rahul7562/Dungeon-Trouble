#pragma once

#include "Memory/MemoryCategory.h"
#include "Memory/IAllocator.h"
#include <cstdint>
#include <array>
#include <mutex>
#include <unordered_map>

namespace DungeonEngine::Memory {

    /**
     * @brief Centralized memory management subsystem.
     * Responsible for tracking allocations, routing to appropriate allocators,
     * and detecting leaks.
     */
    class MemoryManager {
    public:
        /**
         * @brief Statistics for memory tracking.
         */
        struct Stats {
            std::size_t totalAllocatedBytes = 0;
            std::size_t totalFreedBytes = 0;
            std::size_t currentActiveBytes = 0;
            std::size_t peakActiveBytes = 0;
            uint64_t totalAllocationCount = 0;
            uint64_t totalFreeCount = 0;
            uint64_t activeAllocationCount = 0;

            std::array<std::size_t, static_cast<std::size_t>(MemoryCategory::MAX_CATEGORIES)> bytesPerCategory = {0};
        };

        static void initialize();
        static void shutdown();

        /**
         * @brief Gets the singleton instance.
         */
        static MemoryManager& get();

        /**
         * @brief Sets the global allocator. MemoryManager takes ownership.
         */
        void setGlobalAllocator(IAllocator* allocator) noexcept;

        /**
         * @brief Allocates memory using the global allocator and tracks it.
         */
        void* allocate(std::size_t size, std::size_t alignment = sizeof(void*), MemoryCategory category = MemoryCategory::CORE) noexcept;

        /**
         * @brief Frees memory using the global allocator and updates tracking.
         */
        void free(void* ptr) noexcept;

        /**
         * @brief Allocates memory using a specific allocator and tracks it.
         */
        void* allocateFrom(IAllocator& allocator, std::size_t size, std::size_t alignment = sizeof(void*), MemoryCategory category = MemoryCategory::CORE) noexcept;

        /**
         * @brief Frees memory using a specific allocator and updates tracking.
         */
        void freeTo(IAllocator& allocator, void* ptr) noexcept;

        /**
         * @brief Gets current memory statistics.
         */
        const Stats& getStats() const noexcept;

        /**
         * @brief Dumps current memory tracking information to standard output (for debugging).
         */
        void dumpStats() const noexcept;

        /**
         * @brief Checks for memory leaks. Intended to be called at shutdown.
         */
        void checkLeaks() const noexcept;

    private:
        MemoryManager() = default;
        ~MemoryManager() = default;

        MemoryManager(const MemoryManager&) = delete;
        MemoryManager& operator=(const MemoryManager&) = delete;

        struct AllocationRecord {
            std::size_t size;
            MemoryCategory category;
            IAllocator* allocator;
        };

        IAllocator* m_globalAllocator = nullptr;
        Stats m_stats;

        // Use a simple spinlock or mutex if multithreading is enabled in future
        mutable std::mutex m_mutex;

        // Debug tracking
#if defined(DEBUG) || !defined(NDEBUG)
        std::unordered_map<void*, AllocationRecord> m_activeAllocations;
#endif

        static MemoryManager* s_instance;
    };

} // namespace DungeonEngine::Memory

/**
 * @brief Global overrides for new and delete (Optional/Configurable in future, but useful for catching unmanaged allocations)
 * Currently, we expect users to use MemoryManager::get().allocate(...) or specific allocators.
 */
