#include "catch_amalgamated.hpp"
#include "Threading/Synchronization/Mutex.h"
#include "Threading/Synchronization/ConditionVariable.h"
#include "Threading/Synchronization/Event.h"
#include "Threading/Synchronization/Semaphore.h"
#include "Threading/Synchronization/BinarySemaphore.h"
#include "Threading/Synchronization/Latch.h"
#include "Threading/Synchronization/Barrier.h"
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>

using namespace DungeonEngine::Threading;

TEST_CASE("Mutex and ScopedLock", "[Threading][Sync]") {
    Mutex m;
    int sharedResource = 0;

    auto threadFunc = [&]() {
        ScopedLock<Mutex> lock(m);
        sharedResource++;
    };

    std::thread t1(threadFunc);
    std::thread t2(threadFunc);

    t1.join();
    t2.join();

    REQUIRE(sharedResource == 2);
}

TEST_CASE("Event Synchronization", "[Threading][Sync]") {
    Event e(true, false); // Manual reset, initially false
    bool flag = false;

    std::thread t([&]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
        flag = true;
        e.Signal();
    });

    e.Wait();
    REQUIRE(flag == true);

    t.join();
}

TEST_CASE("Semaphore Counting", "[Threading][Sync]") {
    Semaphore sem(2);

    REQUIRE(sem.TryAcquire() == true);
    REQUIRE(sem.TryAcquire() == true);
    REQUIRE(sem.TryAcquire() == false); // Should be empty now

    sem.Release();
    REQUIRE(sem.TryAcquire() == true);
}

TEST_CASE("Latch Coordination", "[Threading][Sync]") {
    Latch latch(3);
    std::atomic<int> readyCount{0};

    auto threadFunc = [&]() {
        readyCount++;
        latch.CountDown();
    };

    std::thread t1(threadFunc);
    std::thread t2(threadFunc);
    std::thread t3(threadFunc);

    latch.Wait();
    REQUIRE(readyCount.load() == 3);

    t1.join();
    t2.join();
    t3.join();
}

TEST_CASE("Barrier Iteration", "[Threading][Sync]") {
    std::atomic<int> completionCount{0};
    auto completion = [&]() { completionCount++; };

    Barrier barrier(2, completion);

    auto threadFunc = [&]() {
        barrier.ArriveAndWait();
    };

    std::thread t1(threadFunc);
    std::thread t2(threadFunc);

    t1.join();
    t2.join();

    REQUIRE(completionCount.load() == 1);
}
