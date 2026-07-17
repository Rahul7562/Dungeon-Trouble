#include "catch_amalgamated.hpp"
#include "Threading/Utilities/AtomicCounter.h"
#include "Threading/Utilities/AtomicFlag.h"
#include "Threading/Utilities/AtomicBool.h"
#include <thread>
#include <vector>

using namespace DungeonEngine::Threading;

TEST_CASE("AtomicCounter Operations", "[Threading][Atomics]") {
    AtomicCounter counter(10);

    REQUIRE(counter.Get() == 10);
    REQUIRE(counter.Increment() == 11);
    REQUIRE(counter.Decrement() == 10);

    counter.Set(5);
    REQUIRE(counter.Get() == 5);
}

TEST_CASE("AtomicCounter Concurrency", "[Threading][Atomics]") {
    AtomicCounter counter(0);
    std::vector<std::thread> threads;

    for (int i = 0; i < 10; ++i) {
        threads.emplace_back([&]() {
            for (int j = 0; j < 1000; ++j) {
                counter.Increment();
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    REQUIRE(counter.Get() == 10000);
}

TEST_CASE("AtomicFlag Operations", "[Threading][Atomics]") {
    AtomicFlag flag;
    REQUIRE_FALSE(flag.IsSet());

    flag.Set();
    REQUIRE(flag.IsSet());

    flag.Clear();
    REQUIRE_FALSE(flag.IsSet());
}

TEST_CASE("AtomicBool Operations", "[Threading][Atomics]") {
    AtomicBool b(true);
    REQUIRE(b.Get() == true);
    REQUIRE(b);

    b.Set(false);
    REQUIRE(b.Get() == false);

    bool expected = false;
    REQUIRE(b.CompareExchange(expected, true) == true);
    REQUIRE(b.Get() == true);
}
