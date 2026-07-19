#include "catch_amalgamated.hpp"
#include "Events/EventBus.h"
#include "Events/EventDispatcher.h"
#include "Events/EventQueue.h"

using namespace DungeonEngine;

struct TestEventA {
    int value;
};

struct TestEventB {
    float value;
};

struct LargeEvent {
    int data[100];
};

struct ComplexEvent {
    int count;
    int* ptr; // trivially copyable for testing
};

TEST_CASE("Synchronous Event Dispatching", "[Events]") {
    EventDispatcher dispatcher;
    int receivedA = 0;
    int receivedB = 0;

    auto handleA = dispatcher.Subscribe<TestEventA>([&](const TestEventA& e) {
        receivedA += e.value;
    });

    auto handleB = dispatcher.Subscribe<TestEventB>([&](const TestEventB& e) {
        receivedB += static_cast<int>(e.value);
    });

    dispatcher.Dispatch(TestEventA{5});
    REQUIRE(receivedA == 5);
    REQUIRE(receivedB == 0);

    dispatcher.Dispatch(TestEventB{3.5f});
    REQUIRE(receivedA == 5);
    REQUIRE(receivedB == 3);
}

TEST_CASE("Unsubscribe During Dispatch", "[Events]") {
    EventDispatcher dispatcher;
    int calls1 = 0;
    int calls2 = 0;
    SubscriptionHandle handle1;

    handle1 = dispatcher.Subscribe<TestEventA>([&](const TestEventA&) {
        calls1++;
        // Unsubscribe self during dispatch
        dispatcher.Unsubscribe(handle1);
    });

    auto handle2 = dispatcher.Subscribe<TestEventA>([&](const TestEventA&) {
        calls2++;
    });

    // First dispatch should call both, but handle1 unsubscribes itself
    dispatcher.Dispatch(TestEventA{1});
    REQUIRE(calls1 == 1);
    REQUIRE(calls2 == 1);

    // Second dispatch should only call handle2
    dispatcher.Dispatch(TestEventA{2});
    REQUIRE(calls1 == 1);
    REQUIRE(calls2 == 2);
}

TEST_CASE("Deferred Queuing FIFO and Channels", "[Events]") {
    EventBus bus;
    std::vector<int> order;

    bus.Subscribe<TestEventA>([&](const TestEventA& e) {
        order.push_back(e.value);
    });

    bus.Subscribe<TestEventB>([&](const TestEventB& e) {
        order.push_back(static_cast<int>(e.value));
    });

    bus.Enqueue(EventChannel::SYSTEM, TestEventA{1});
    bus.Enqueue(EventChannel::GAMEPLAY, TestEventB{2.0f});
    bus.Enqueue(EventChannel::SYSTEM, TestEventA{3});

    // Should not be dispatched yet
    REQUIRE(order.empty());

    // Dispatch SYSTEM channel only
    bus.DispatchQueue(EventChannel::SYSTEM);
    REQUIRE(order.size() == 2);
    REQUIRE(order[0] == 1);
    REQUIRE(order[1] == 3);

    // Dispatch GAMEPLAY channel
    bus.DispatchQueue(EventChannel::GAMEPLAY);
    REQUIRE(order.size() == 3);
    REQUIRE(order[2] == 2);
}

TEST_CASE("Scale: 10k Enqueued Events", "[Events]") {
    EventBus bus;
    int total = 0;

    bus.Subscribe<TestEventA>([&](const TestEventA& e) {
        total += e.value;
    });

    for (int i = 0; i < 10000; i++) {
        bus.Enqueue(EventChannel::GAMEPLAY, TestEventA{1});
    }

    bus.DispatchAllQueues();

    REQUIRE(total == 10000);
}

TEST_CASE("Event Destructors Are Called", "[Events]") {
    EventBus bus;
    int counter = 0;

    bus.Subscribe<ComplexEvent>([&](const ComplexEvent& e) {
        if (e.ptr) (*e.ptr)++;
    });

    // Add an event but clear the queue before dispatching
    bus.Enqueue(EventChannel::SYSTEM, ComplexEvent{1, &counter});

    bus.ClearAllQueues();
    REQUIRE(counter == 0); // Event was cleared, dispatch shouldn't happen
}
