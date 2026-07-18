#define CATCH_CONFIG_MAIN
#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include <Memory/MemoryUtils.h>
#include <Memory/LinearAllocator.h>
#include <Memory/StackAllocator.h>
#include <Memory/PoolAllocator.h>
#include <Memory/FreeListAllocator.h>
#include <Memory/ArenaAllocator.h>
#include <Memory/MemoryManager.h>
#include <vector>
#include <cstdint>

using namespace DungeonEngine::Memory;

TEST_CASE("MemoryUtils", "[Memory]") {
    SECTION("isPowerOfTwo") {
        REQUIRE(MemoryUtils::isPowerOfTwo(2) == true);
        REQUIRE(MemoryUtils::isPowerOfTwo(4) == true);
        REQUIRE(MemoryUtils::isPowerOfTwo(16) == true);
        REQUIRE(MemoryUtils::isPowerOfTwo(3) == false);
        REQUIRE(MemoryUtils::isPowerOfTwo(0) == false);
    }

    SECTION("alignForward") {
        void* ptr = reinterpret_cast<void*>(0x1003);
        void* aligned = MemoryUtils::alignForward(ptr, 8);
        REQUIRE(reinterpret_cast<uintptr_t>(aligned) == 0x1008);
        REQUIRE(MemoryUtils::isAligned(aligned, 8));
    }
}

TEST_CASE("LinearAllocator", "[Memory]") {
    const std::size_t size = 1024;
    std::vector<uint8_t> buffer(size);
    LinearAllocator allocator(size, buffer.data());

    SECTION("Basic Allocation") {
        void* ptr1 = allocator.allocate(128, 8);
        REQUIRE(ptr1 != nullptr);
        REQUIRE(MemoryUtils::isAligned(ptr1, 8));

        void* ptr2 = allocator.allocate(256, 16);
        REQUIRE(ptr2 != nullptr);
        REQUIRE(MemoryUtils::isAligned(ptr2, 16));

        REQUIRE(allocator.getUsedSize() > 0);
    }

    SECTION("Out of Memory") {
        void* ptr1 = allocator.allocate(size + 1);
        REQUIRE(ptr1 == nullptr);
    }

    SECTION("Clear") {
        allocator.allocate(100);
        REQUIRE(allocator.getUsedSize() >= 100);
        allocator.clear();
        REQUIRE(allocator.getUsedSize() == 0);
    }
}

TEST_CASE("StackAllocator", "[Memory]") {
    const std::size_t size = 1024;
    std::vector<uint8_t> buffer(size);
    StackAllocator allocator(size, buffer.data());

    SECTION("LIFO Allocation and Free") {
        void* ptr1 = allocator.allocate(64, 8);
        void* ptr2 = allocator.allocate(128, 16);
        void* ptr3 = allocator.allocate(256, 32);

        REQUIRE(ptr1 != nullptr);
        REQUIRE(ptr2 != nullptr);
        REQUIRE(ptr3 != nullptr);

        std::size_t used = allocator.getUsedSize();
        (void)used; // Just to silence unused variable warning

        allocator.free(ptr3);
        allocator.free(ptr2);
        allocator.free(ptr1);

        REQUIRE(allocator.getUsedSize() == 0);
    }

    SECTION("Markers") {
        void* ptr1 = allocator.allocate(64);
        auto marker = allocator.getMarker();
        void* ptr2 = allocator.allocate(128);
        void* ptr3 = allocator.allocate(256);
        (void)ptr1;
        (void)ptr2;
        (void)ptr3;

        allocator.freeToMarker(marker);
        REQUIRE(allocator.getUsedSize() == marker);
    }
}

TEST_CASE("PoolAllocator", "[Memory]") {
    const std::size_t blockSize = 32;
    const std::size_t alignment = 8;
    const std::size_t numBlocks = 10;
    const std::size_t size = blockSize * numBlocks + alignment;
    std::vector<uint8_t> buffer(size);

    PoolAllocator allocator(blockSize, alignment, size, buffer.data());

    SECTION("Allocation and Free") {
        void* ptr1 = allocator.allocate(blockSize);
        REQUIRE(ptr1 != nullptr);
        REQUIRE(allocator.getUsedSize() == blockSize);

        allocator.free(ptr1);
        REQUIRE(allocator.getUsedSize() == 0);
    }
}

TEST_CASE("FreeListAllocator", "[Memory]") {
    const std::size_t size = 1024;
    std::vector<uint8_t> buffer(size);
    FreeListAllocator allocator(size, buffer.data());

    SECTION("Allocation and Free") {
        void* ptr1 = allocator.allocate(64, 8);
        REQUIRE(ptr1 != nullptr);
        void* ptr2 = allocator.allocate(128, 16);
        REQUIRE(ptr2 != nullptr);

        allocator.free(ptr1);
        void* ptr3 = allocator.allocate(32, 8);
        REQUIRE(ptr3 != nullptr);
    }
}

TEST_CASE("ArenaAllocator", "[Memory]") {
    ArenaAllocator allocator(1024);

    SECTION("Basic Allocation") {
        void* ptr1 = allocator.allocate(128, 8);
        REQUIRE(ptr1 != nullptr);
        void* ptr2 = allocator.allocate(2048, 16); // Larger than default chunk
        REQUIRE(ptr2 != nullptr);
    }
}

TEST_CASE("MemoryManager", "[Memory]") {
    MemoryManager::initialize();
    auto& manager = MemoryManager::get();

    ArenaAllocator globalAlloc(4096);
    manager.setGlobalAllocator(&globalAlloc);

    SECTION("Allocation Tracking") {
        void* ptr1 = manager.allocate(128, 8, MemoryCategory::CORE);
        void* ptr2 = manager.allocate(256, 16, MemoryCategory::RENDERER);

        const auto& stats = manager.getStats();
        REQUIRE(stats.activeAllocationCount == 2);
        REQUIRE(stats.bytesPerCategory[static_cast<std::size_t>(MemoryCategory::CORE)] > 0);
        REQUIRE(stats.bytesPerCategory[static_cast<std::size_t>(MemoryCategory::RENDERER)] > 0);

        manager.free(ptr1);
        manager.free(ptr2);

        REQUIRE(manager.getStats().activeAllocationCount == 0);
    }

    MemoryManager::shutdown();
}
