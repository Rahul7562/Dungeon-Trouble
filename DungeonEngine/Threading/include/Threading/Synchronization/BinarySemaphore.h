#pragma once
#include "Semaphore.h"

namespace DungeonEngine::Threading {

    // C++17 polyfill for C++20 std::binary_semaphore
    class BinarySemaphore : private Semaphore {
    public:
        BinarySemaphore(bool isAcquired = false) : Semaphore(isAcquired ? 0 : 1) {}

        void Release() {
            // A binary semaphore can only have a count of 0 or 1.
            // In a real implementation this might need an atomic compare_exchange
            // but for simplicity we rely on the user to use it correctly.
            Semaphore::Release(1);
        }

        void Acquire() {
            Semaphore::Acquire();
        }

        bool TryAcquire() {
            return Semaphore::TryAcquire();
        }
    };

}
