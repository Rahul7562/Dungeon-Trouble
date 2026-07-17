#pragma once
#include <mutex>
#include <shared_mutex>

namespace DungeonEngine::Threading {

    class Mutex {
    public:
        Mutex() = default;
        ~Mutex() = default;

        Mutex(const Mutex&) = delete;
        Mutex& operator=(const Mutex&) = delete;

        void Lock() { m_Mutex.lock(); }
        void Unlock() { m_Mutex.unlock(); }
        bool TryLock() { return m_Mutex.try_lock(); }

        std::mutex& GetNative() { return m_Mutex; }

    private:
        std::mutex m_Mutex;
    };

    class RecursiveMutex {
    public:
        RecursiveMutex() = default;
        ~RecursiveMutex() = default;

        RecursiveMutex(const RecursiveMutex&) = delete;
        RecursiveMutex& operator=(const RecursiveMutex&) = delete;

        void Lock() { m_Mutex.lock(); }
        void Unlock() { m_Mutex.unlock(); }
        bool TryLock() { return m_Mutex.try_lock(); }

        std::recursive_mutex& GetNative() { return m_Mutex; }

    private:
        std::recursive_mutex m_Mutex;
    };

    class SharedMutex {
    public:
        SharedMutex() = default;
        ~SharedMutex() = default;

        SharedMutex(const SharedMutex&) = delete;
        SharedMutex& operator=(const SharedMutex&) = delete;

        void Lock() { m_Mutex.lock(); }
        void Unlock() { m_Mutex.unlock(); }
        bool TryLock() { return m_Mutex.try_lock(); }

        void LockShared() { m_Mutex.lock_shared(); }
        void UnlockShared() { m_Mutex.unlock_shared(); }
        bool TryLockShared() { return m_Mutex.try_lock_shared(); }

        std::shared_mutex& GetNative() { return m_Mutex; }

    private:
        std::shared_mutex m_Mutex;
    };

    // RAII wrappers
    template<typename T>
    class ScopedLock {
    public:
        explicit ScopedLock(T& mutex) : m_Mutex(mutex) { m_Mutex.Lock(); }
        ~ScopedLock() { m_Mutex.Unlock(); }

        ScopedLock(const ScopedLock&) = delete;
        ScopedLock& operator=(const ScopedLock&) = delete;
    private:
        T& m_Mutex;
    };

    template<typename T>
    class ScopedSharedLock {
    public:
        explicit ScopedSharedLock(T& mutex) : m_Mutex(mutex) { m_Mutex.LockShared(); }
        ~ScopedSharedLock() { m_Mutex.UnlockShared(); }

        ScopedSharedLock(const ScopedSharedLock&) = delete;
        ScopedSharedLock& operator=(const ScopedSharedLock&) = delete;
    private:
        T& m_Mutex;
    };
}
