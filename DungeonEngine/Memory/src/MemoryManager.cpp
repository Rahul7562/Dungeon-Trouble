#include "Memory/MemoryManager.h"
#include <Core/Assert.h>
#include <cstdio>
#include <cstdlib>

namespace DungeonEngine::Memory {

    MemoryManager* MemoryManager::s_instance = nullptr;

    void MemoryManager::initialize() {
        DT_ASSERT(s_instance == nullptr, "MemoryManager already initialized");
        // Using raw malloc for the manager itself to avoid infinite recursion or relying on uninitialized state
        void* mem = std::malloc(sizeof(MemoryManager));
        s_instance = new (mem) MemoryManager();
    }

    void MemoryManager::shutdown() {
        if (s_instance) {
#if defined(DEBUG) || !defined(NDEBUG)
            s_instance->checkLeaks();
#endif
            // Clean up the global allocator if we own it (assuming we do for now)
            // In a real scenario, this might need a more robust ownership model
            if (s_instance->m_globalAllocator) {
                // If the global allocator is dynamically allocated, we should free it.
                // This is a simplification. Ideally, the engine provides a static arena for it.
            }

            s_instance->~MemoryManager();
            std::free(s_instance);
            s_instance = nullptr;
        }
    }

    MemoryManager& MemoryManager::get() {
        DT_ASSERT(s_instance != nullptr, "MemoryManager not initialized");
        return *s_instance;
    }

    void MemoryManager::setGlobalAllocator(IAllocator* allocator) noexcept {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_globalAllocator = allocator;
    }

    void* MemoryManager::allocate(std::size_t size, std::size_t alignment, MemoryCategory category) noexcept {
        DT_ASSERT(m_globalAllocator != nullptr, "Global allocator not set");
        return allocateFrom(*m_globalAllocator, size, alignment, category);
    }

    void MemoryManager::free(void* ptr) noexcept {
        if (!ptr) return;
        DT_ASSERT(m_globalAllocator != nullptr, "Global allocator not set");
        freeTo(*m_globalAllocator, ptr);
    }

    void* MemoryManager::allocateFrom(IAllocator& allocator, std::size_t size, std::size_t alignment, MemoryCategory category) noexcept {
        void* ptr = allocator.allocate(size, alignment);

        if (ptr) {
            std::lock_guard<std::mutex> lock(m_mutex);
            m_stats.totalAllocatedBytes += size;
            m_stats.currentActiveBytes += size;
            if (m_stats.currentActiveBytes > m_stats.peakActiveBytes) {
                m_stats.peakActiveBytes = m_stats.currentActiveBytes;
            }
            m_stats.totalAllocationCount++;
            m_stats.activeAllocationCount++;
            m_stats.bytesPerCategory[static_cast<std::size_t>(category)] += size;

#if defined(DEBUG) || !defined(NDEBUG)
            m_activeAllocations[ptr] = {size, category, &allocator};
#endif
        }

        return ptr;
    }

    void MemoryManager::freeTo(IAllocator& allocator, void* ptr) noexcept {
        if (!ptr) return;

        std::size_t sizeToFree = 0;
        MemoryCategory category = MemoryCategory::CORE;

        {
            std::lock_guard<std::mutex> lock(m_mutex);
#if defined(DEBUG) || !defined(NDEBUG)
            auto it = m_activeAllocations.find(ptr);
            if (it != m_activeAllocations.end()) {
                sizeToFree = it->second.size;
                category = it->second.category;
                DT_ASSERT(it->second.allocator == &allocator, "Freeing memory with incorrect allocator");
                m_activeAllocations.erase(it);
            } else {
                // Warning: Freeing untracked pointer
                std::fprintf(stderr, "Warning: Freeing untracked memory pointer %p\n", ptr);
            }
#else
            // Without tracking, we can't accurately decrease the stats size.
            // This requires allocator support or tracking overhead.
            // For a release build, we might accept inaccurate stats or require allocators
            // to return the size of the freed block.
#endif

            if (sizeToFree > 0) {
                m_stats.totalFreedBytes += sizeToFree;
                m_stats.currentActiveBytes -= sizeToFree;
                m_stats.totalFreeCount++;
                m_stats.activeAllocationCount--;
                m_stats.bytesPerCategory[static_cast<std::size_t>(category)] -= sizeToFree;
            }
        }

        allocator.free(ptr);
    }

    const MemoryManager::Stats& MemoryManager::getStats() const noexcept {
        return m_stats;
    }

    void MemoryManager::dumpStats() const noexcept {
        std::lock_guard<std::mutex> lock(m_mutex); // Avoid mutable mutex for simple dump
        std::printf("--- Memory Manager Stats ---\n");
        std::printf("Total Allocated: %zu bytes\n", m_stats.totalAllocatedBytes);
        std::printf("Total Freed: %zu bytes\n", m_stats.totalFreedBytes);
        std::printf("Current Active: %zu bytes\n", m_stats.currentActiveBytes);
        std::printf("Peak Active: %zu bytes\n", m_stats.peakActiveBytes);
        std::printf("Active Allocation Count: %llu\n", (unsigned long long)m_stats.activeAllocationCount);

        std::printf("\n--- Usage By Category ---\n");
        for (std::size_t i = 0; i < static_cast<std::size_t>(MemoryCategory::MAX_CATEGORIES); ++i) {
            if (m_stats.bytesPerCategory[i] > 0) {
                std::printf("%s: %zu bytes\n", getCategoryName(static_cast<MemoryCategory>(i)), m_stats.bytesPerCategory[i]);
            }
        }
        std::printf("----------------------------\n");
    }

    void MemoryManager::checkLeaks() const noexcept {
#if defined(DEBUG) || !defined(NDEBUG)
        std::lock_guard<std::mutex> lock(m_mutex);
        if (!m_activeAllocations.empty()) {
            std::fprintf(stderr, "\n=====================================\n");
            std::fprintf(stderr, "MEMORY LEAK DETECTED!\n");
            std::fprintf(stderr, "Found %zu unfreed allocations.\n", m_activeAllocations.size());

            for (const auto& pair : m_activeAllocations) {
                std::fprintf(stderr, "Leak: %p, Size: %zu bytes, Category: %s\n",
                             pair.first, pair.second.size, getCategoryName(pair.second.category));
            }
            std::fprintf(stderr, "=====================================\n\n");

            // In a strict engine, this could be an assertion failure.
            // DT_ASSERT(false, "Memory Leaks detected at shutdown");
        } else {
            std::printf("No memory leaks detected. Great job!\n");
        }
#endif
    }

} // namespace DungeonEngine::Memory
