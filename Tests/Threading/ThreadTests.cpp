#include "catch_amalgamated.hpp"
#include "Threading/Thread.h"
#include "Threading/ThreadManager.h"
#include "Threading/Utilities/ThreadLocal.h"
#include "Threading/Synchronization/Event.h"
#include "Threading/Utilities/Timing.h"
#include <memory>

using namespace DungeonEngine::Threading;
using namespace Core;

TEST_CASE("Thread Basic Lifecycle", "[Threading]") {
    Event e1;
    Event e2;
    bool executed = false;

    Thread t("TestThread", [&](IThread* self) {
        REQUIRE(self->GetName() == "TestThread");
        REQUIRE(ThreadContext::GetThreadName() == "TestThread");
        executed = true;
        e1.Signal();
        e2.Wait(); // Keep thread alive until we check it
    });

    REQUIRE(t.GetName() == "TestThread");
    REQUIRE_FALSE(t.IsRunning());

    t.Start();

    e1.Wait(); // Wait until thread is definitely running
    REQUIRE(t.IsRunning());

    e2.Signal(); // Let it finish
    t.Join(); // Ensure it completes

    REQUIRE(executed);
    REQUIRE_FALSE(t.IsRunning());
}

TEST_CASE("Thread Stop Request", "[Threading]") {
    Thread t("StoppableThread", [](IThread* self) {
        while (!self->StopRequested()) {
            Timing::Yield();
        }
    });

    t.Start();
    REQUIRE(t.IsRunning());

    Timing::Sleep(50); // Let it run briefly

    t.RequestStop();
    t.Join();

    REQUIRE(t.StopRequested());
    REQUIRE_FALSE(t.IsRunning());
}

TEST_CASE("ThreadManager Lifecycle", "[Threading]") {
    ThreadManager manager;

    auto t1 = manager.CreateThread("Managed1", [](IThread* self){
        while (!self->StopRequested()) Timing::Yield();
    });

    auto t2 = manager.CreateThread("Managed2", [](IThread* self){
        while (!self->StopRequested()) Timing::Yield();
    });

    t1->Start();
    t2->Start();

    REQUIRE(manager.GetActiveThreadCount() == 2);

    manager.ShutdownAll();

    REQUIRE(manager.GetActiveThreadCount() == 0);
    REQUIRE_FALSE(t1->IsRunning());
    REQUIRE_FALSE(t2->IsRunning());
}
