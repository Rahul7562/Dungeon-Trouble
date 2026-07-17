#pragma once

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <type_traits>
#include <utility>

namespace DungeonEngine::Memory {

    /**
     * @brief Size conversion helpers
     */
    constexpr std::size_t operator"" _KB(unsigned long long kb) {
        return kb * 1024;
    }

    constexpr std::size_t operator"" _MB(unsigned long long mb) {
        return mb * 1024 * 1024;
    }

    constexpr std::size_t operator"" _GB(unsigned long long gb) {
        return gb * 1024 * 1024 * 1024;
    }

    class MemoryUtils {
    public:
        /**
         * @brief Aligns a memory address forward to a specific alignment.
         * @param address The address to align.
         * @param alignment The alignment requirement (must be a power of two).
         * @return The aligned address.
         */
        static void* alignForward(void* address, std::size_t alignment) noexcept;

        /**
         * @brief Aligns a memory address forward to a specific alignment.
         * @param address The integer address to align.
         * @param alignment The alignment requirement (must be a power of two).
         * @return The aligned integer address.
         */
        static uintptr_t alignForward(uintptr_t address, std::size_t alignment) noexcept;

        /**
         * @brief Calculates the adjustment needed to align an address.
         * @param address The address to align.
         * @param alignment The alignment requirement (must be a power of two).
         * @return The adjustment in bytes.
         */
        static std::size_t getAlignmentAdjustment(const void* address, std::size_t alignment) noexcept;

        /**
         * @brief Checks if a memory address is aligned.
         * @param address The address to check.
         * @param alignment The alignment requirement.
         * @return True if aligned, false otherwise.
         */
        static bool isAligned(const void* address, std::size_t alignment) noexcept;

        /**
         * @brief Checks if a numeric value is a power of two.
         * @param x The value to check.
         * @return True if power of two.
         */
        static constexpr bool isPowerOfTwo(std::size_t x) noexcept {
            return (x != 0) && ((x & (x - 1)) == 0);
        }

        /**
         * @brief Copies memory from source to destination.
         * @param dest The destination address.
         * @param src The source address.
         * @param size The number of bytes to copy.
         */
        static void copy(void* dest, const void* src, std::size_t size) noexcept;

        /**
         * @brief Moves memory from source to destination (handles overlapping memory).
         * @param dest The destination address.
         * @param src The source address.
         * @param size The number of bytes to move.
         */
        static void move(void* dest, const void* src, std::size_t size) noexcept;

        /**
         * @brief Fills a block of memory with a specific value.
         * @param dest The destination address.
         * @param value The value to fill with.
         * @param size The number of bytes to fill.
         */
        static void fill(void* dest, uint8_t value, std::size_t size) noexcept;

        /**
         * @brief Zeroes a block of memory.
         * @param dest The destination address.
         * @param size The number of bytes to zero.
         */
        static void zero(void* dest, std::size_t size) noexcept;
    };

} // namespace DungeonEngine::Memory
