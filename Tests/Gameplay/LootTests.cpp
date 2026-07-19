#include <catch_amalgamated.hpp>
#include <Gameplay/Loot/LootTypes.h>
#include <Gameplay/Loot/LootRoller.h>
#include <Gameplay/Loot/LootSystem.h>
#include <Gameplay/Loot/LootComponents.h>
#include <Gameplay/Loot/Events.h>
#include <Gameplay/Combat/Events.h>
#include <Gameplay/Items/Inventory.h>
#include <Gameplay/Items/ItemDefTable.h>
#include <Simulation/SimRandom.h>
#include <ECS/Registry.h>
#include <Events/EventBus.h>

using namespace DungeonEngine;
using namespace DungeonEngine::Gameplay;
using namespace DungeonEngine::ECS;

TEST_CASE("LootRoller logic", "[Loot]") {
    LootTableDef table;
    table.id = 1;
    table.rolls = 2;

    // Guaranteed item
    LootEntry guaranteed;
    guaranteed.itemDefId = 100;
    guaranteed.minCount = 2;
    guaranteed.maxCount = 2;
    guaranteed.guaranteed = true;
    table.entries.push_back(guaranteed);

    // Weighted item 1
    LootEntry weighted1;
    weighted1.itemDefId = 200;
    weighted1.minCount = 1;
    weighted1.maxCount = 3;
    weighted1.weight = 10.0f;
    weighted1.guaranteed = false;
    table.entries.push_back(weighted1);

    // Weighted item 2
    LootEntry weighted2;
    weighted2.itemDefId = 300;
    weighted2.minCount = 1;
    weighted2.maxCount = 1;
    weighted2.weight = 5.0f;
    weighted2.guaranteed = false;
    table.entries.push_back(weighted2);

    SimRandom rng(12345); // Fixed seed for determinism
    std::vector<ItemStack> drops;

    // Deliberate bug to test failure: change seed, un-comment later
    // SimRandom rng(99999);

    LootRoller::Roll(table, rng, drops);

    // Validate output
    REQUIRE(drops.size() >= 1);

    bool foundGuaranteed = false;
    for (const auto& drop : drops) {
        if (drop.defId == 100) {
            foundGuaranteed = true;
            REQUIRE(drop.count == 2);
        }
    }
    REQUIRE(foundGuaranteed);

    // We expect some weighted drops since rolls = 2 and weights > 0.
    // The exact drops depend on the fixed seed, let's just make sure it's sensible.
    for (const auto& drop : drops) {
        if (drop.defId == 200) {
            REQUIRE(drop.count >= 1);
            REQUIRE(drop.count <= 3);
        } else if (drop.defId == 300) {
            REQUIRE(drop.count == 1);
        }
    }
}

TEST_CASE("LootRoller handles zero weight correctly", "[Loot]") {
    LootTableDef table;
    table.rolls = 10;
    LootEntry entry;
    entry.itemDefId = 100;
    entry.weight = 0.0f;
    table.entries.push_back(entry);

    SimRandom rng(1);
    std::vector<ItemStack> drops;
    LootRoller::Roll(table, rng, drops);
    REQUIRE(drops.empty());
}

TEST_CASE("LootSystem End-to-End", "[Loot]") {
    Registry registry;
    EventBus eventBus;
    LootTableDefTable lootTableDefTable;

    LootTableDef table;
    table.id = 1;
    table.rolls = 1;
    LootEntry entry;
    entry.itemDefId = 500;
    entry.minCount = 5;
    entry.maxCount = 5;
    entry.guaranteed = true;
    table.entries.push_back(entry);
    lootTableDefTable.Register(table);

    LootSystem lootSystem(&registry, &eventBus, &lootTableDefTable);

    Entity enemy = registry.Create();
    registry.AddComponent<LootComponent>(enemy, 1u);

    // Kill enemy
    EntityDiedEvent deathEvent;
    deathEvent.entity = enemy;
    eventBus.Enqueue(EventChannel::GAMEPLAY, deathEvent);
    eventBus.DispatchQueue(EventChannel::GAMEPLAY); // Send to LootSystem

    SimContext context;
    context.tickNumber = 10;
    context.randomSeed = 42;
    lootSystem.Tick(context);

    // Verify LootDroppedEvent
    int dropEvents = 0;
    Entity droppedEntity;
    auto sub = eventBus.Subscribe<LootDroppedEvent>([&](const LootDroppedEvent& e) {
        dropEvents++;
        droppedEntity = e.lootEntity;
        REQUIRE(e.itemDefId == 500);
        REQUIRE(e.count == 5);
    });
    (void)sub;

    eventBus.DispatchQueue(EventChannel::GAMEPLAY);
    REQUIRE(dropEvents == 1);

    // Verify ECS component
    REQUIRE(registry.IsAlive(droppedEntity));
    DroppedLoot* dropComp = registry.GetComponent<DroppedLoot>(droppedEntity);
    REQUIRE(dropComp != nullptr);
    REQUIRE(dropComp->itemDefId == 500);
    REQUIRE(dropComp->count == 5);
    REQUIRE(dropComp->droppedAtTick == 10);

    // Test Pickup
    ItemDefTable itemDefTable;
    ItemDef itemDef;
    itemDef.id = 500;
    itemDef.maxStack = 10;
    itemDefTable.Register(itemDef);

    Inventory inv(5);
    auto res = lootSystem.PickUp(droppedEntity, inv, itemDefTable);
    REQUIRE(res.IsOk());
    REQUIRE(res.Get() == true); // fully picked up

    REQUIRE(!registry.IsAlive(droppedEntity)); // Entity destroyed
    REQUIRE(inv.CountOf(500) == 5);
}

TEST_CASE("LootSystem Partial Pickup", "[Loot]") {
    Registry registry;
    EventBus eventBus;
    LootTableDefTable lootTableDefTable;
    LootSystem lootSystem(&registry, &eventBus, &lootTableDefTable);

    ItemDefTable itemDefTable;
    ItemDef itemDef;
    itemDef.id = 500;
    itemDef.maxStack = 2; // Can only hold 2 per stack
    itemDefTable.Register(itemDef);

    Entity lootEntity = registry.Create();
    DroppedLoot& drop = registry.AddComponent<DroppedLoot>(lootEntity); // Drop of 5
    drop.itemDefId = 500;
    drop.count = 5;
    drop.droppedAtTick = 0;

    Inventory inv(1); // 1 slot, max stack 2
    auto res = lootSystem.PickUp(lootEntity, inv, itemDefTable);
    REQUIRE(res.IsOk());
    REQUIRE(res.Get() == false); // partially picked up

    REQUIRE(registry.IsAlive(lootEntity));
    DroppedLoot* dropComp = registry.GetComponent<DroppedLoot>(lootEntity);
    REQUIRE(dropComp != nullptr);
    REQUIRE(dropComp->count == 3); // 5 - 2 = 3 left
    REQUIRE(inv.CountOf(500) == 2);
}

TEST_CASE("LootSystem Determinism", "[Loot]") {
    Registry registry1, registry2;
    EventBus eventBus1, eventBus2;
    LootTableDefTable lootTableDefTable;

    LootTableDef table;
    table.id = 1;
    table.rolls = 5;
    LootEntry entry;
    entry.itemDefId = 100;
    entry.minCount = 1;
    entry.maxCount = 3;
    entry.weight = 10.0f;
    table.entries.push_back(entry);
    lootTableDefTable.Register(table);

    LootSystem lootSystem1(&registry1, &eventBus1, &lootTableDefTable);
    LootSystem lootSystem2(&registry2, &eventBus2, &lootTableDefTable);

    Entity enemy1 = registry1.Create();
    registry1.AddComponent<LootComponent>(enemy1, 1u);
    Entity enemy2 = registry2.Create();
    registry2.AddComponent<LootComponent>(enemy2, 1u);

    EntityDiedEvent deathEvent1; deathEvent1.entity = enemy1;
    EntityDiedEvent deathEvent2; deathEvent2.entity = enemy2;

    eventBus1.Enqueue(EventChannel::GAMEPLAY, deathEvent1);
    eventBus2.Enqueue(EventChannel::GAMEPLAY, deathEvent2);

    eventBus1.DispatchQueue(EventChannel::GAMEPLAY);
    eventBus2.DispatchQueue(EventChannel::GAMEPLAY);

    SimContext context;
    context.randomSeed = 4242; // same seed

    std::vector<ItemStack> drops1;
    auto sub1 = eventBus1.Subscribe<LootDroppedEvent>([&](const LootDroppedEvent& e) {
        drops1.push_back({e.itemDefId, e.count});
    });
    (void)sub1;

    std::vector<ItemStack> drops2;
    auto sub2 = eventBus2.Subscribe<LootDroppedEvent>([&](const LootDroppedEvent& e) {
        drops2.push_back({e.itemDefId, e.count});
    });
    (void)sub2;

    // Ensure enemy entity IDs are the same for determinism (both created as first entity)
    REQUIRE(enemy1 == enemy2);

    lootSystem1.Tick(context);
    lootSystem2.Tick(context);

    eventBus1.DispatchQueue(EventChannel::GAMEPLAY);
    eventBus2.DispatchQueue(EventChannel::GAMEPLAY);

    REQUIRE(drops1.size() == drops2.size());
    for (size_t i = 0; i < drops1.size(); ++i) {
        REQUIRE(drops1[i].defId == drops2[i].defId);
        REQUIRE(drops1[i].count == drops2[i].count);
    }
}
