#include <catch_amalgamated.hpp>
#include <ECS/Registry.h>
#include <ECS/CommandBuffer.h>

using namespace DungeonEngine::ECS;
using namespace Core;

struct Position {
    float x;
    float y;
};

struct Velocity {
    float dx;
    float dy;
};

TEST_CASE("Entity Lifecycle and Generation Recycling", "[ECS]") {
    Registry registry;

    Entity e1 = registry.Create();
    REQUIRE(e1.GetIndex() == 0);
    REQUIRE(e1.GetGeneration() == 1);
    REQUIRE(registry.IsAlive(e1));

    Entity e2 = registry.Create();
    REQUIRE(e2.GetIndex() == 1);
    REQUIRE(e2.GetGeneration() == 1);
    REQUIRE(registry.IsAlive(e2));

    registry.Destroy(e1);
    REQUIRE(!registry.IsAlive(e1)); // Stale handle not alive

    Entity e3 = registry.Create();
    REQUIRE(e3.GetIndex() == 0); // Recycled index
    REQUIRE(e3.GetGeneration() == 2); // Generation bumped
    REQUIRE(registry.IsAlive(e3));
    REQUIRE(!registry.IsAlive(e1)); // e1 should STILL be dead (generation mismatch)
}

TEST_CASE("Component Add/Get/Remove/Has", "[ECS]") {
    Registry registry;
    Entity e1 = registry.Create();
    Entity e2 = registry.Create();

    REQUIRE(!registry.HasComponent<Position>(e1));

    registry.AddComponent<Position>(e1, 10.0f, 20.0f);
    REQUIRE(registry.HasComponent<Position>(e1));
    REQUIRE(!registry.HasComponent<Position>(e2));

    Position* pos = registry.GetComponent<Position>(e1);
    REQUIRE(pos != nullptr);
    REQUIRE(pos->x == 10.0f);
    REQUIRE(pos->y == 20.0f);

    registry.RemoveComponent<Position>(e1);
    REQUIRE(!registry.HasComponent<Position>(e1));
    REQUIRE(registry.GetComponent<Position>(e1) == nullptr);
}

TEST_CASE("View Iteration", "[ECS]") {
    Registry registry;

    Entity e1 = registry.Create();
    Entity e2 = registry.Create();
    Entity e3 = registry.Create();

    registry.AddComponent<Position>(e1, 1.0f, 1.0f);
    registry.AddComponent<Velocity>(e1, 0.1f, 0.1f);

    registry.AddComponent<Position>(e2, 2.0f, 2.0f); // Missing Velocity

    registry.AddComponent<Position>(e3, 3.0f, 3.0f);
    registry.AddComponent<Velocity>(e3, 0.3f, 0.3f);

    int count = 0;
    registry.GetView<Position, Velocity>().Each([&](Entity entity, Position& p, Velocity& v) {
        (void)entity; // Mark unused
        count++;
        // The one missing Velocity should be skipped
        REQUIRE(p.x == (v.dx * 10.0f));
    });

    REQUIRE(count == 2);
}

TEST_CASE("CommandBuffer Defers Operations", "[ECS]") {
    Registry registry;
    CommandBuffer cmd;

    Entity e1 = registry.Create();
    Entity e2 = registry.Create();

    registry.AddComponent<Position>(e1, 0.0f, 0.0f);

    // Defer adding velocity
    cmd.AddComponent<Velocity>(e1, 1.0f, 1.0f);
    // Defer destroying e2
    cmd.DestroyEntity(e2);
    // Defer removing position from e1
    cmd.RemoveComponent<Position>(e1);

    // State before flush
    REQUIRE(!registry.HasComponent<Velocity>(e1));
    REQUIRE(registry.HasComponent<Position>(e1));
    REQUIRE(registry.IsAlive(e2));

    cmd.Flush(registry);

    // State after flush
    REQUIRE(registry.HasComponent<Velocity>(e1));
    REQUIRE(!registry.HasComponent<Position>(e1));
    REQUIRE(!registry.IsAlive(e2));
}

TEST_CASE("Stress Test - 10,000 Entities", "[ECS]") {
    Registry registry;

    for (int i = 0; i < 10000; ++i) {
        Entity e = registry.Create();
        if (i % 2 == 0) {
            registry.AddComponent<Position>(e, static_cast<float>(i), 0.0f);
            registry.AddComponent<Velocity>(e, 1.0f, 1.0f);
        } else {
            registry.AddComponent<Position>(e, static_cast<float>(i), 0.0f);
        }
    }

    int iteratedCount = 0;
    registry.GetView<Position, Velocity>().Each([&](Entity entity, Position& p, Velocity& v) {
        (void)entity;
        p.x += v.dx;
        p.y += v.dy;
        iteratedCount++;
    });

    REQUIRE(iteratedCount == 5000);
}
