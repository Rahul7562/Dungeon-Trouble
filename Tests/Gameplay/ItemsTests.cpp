#include <catch_amalgamated.hpp>
#include <Gameplay/Items/ItemDefTable.h>
#include <Gameplay/Items/Inventory.h>
#include <Gameplay/Items/EquipmentOps.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Core/Result.h>
#include <Math/MathUtils.h> // for nearlyEqual

using namespace DungeonEngine::Gameplay;
using namespace DungeonEngine::Math;
using namespace Core;

TEST_CASE("Items - JSON Parsing", "[Items][ItemDefTable]") {
    ItemDefTable table;

    String json = R"([
        {
            "id": 1,
            "name": "Rusty Sword",
            "rarity": "Common",
            "slot": "MainHand",
            "maxStack": 1,
            "equipModifiers": [
                { "stat": "AttackPower", "op": "Flat", "value": 5.0, "durationTicks": -1 }
            ]
        },
        {
            "id": 2,
            "name": "Health Potion",
            "rarity": "Uncommon",
            "slot": "None",
            "maxStack": 20
        },
        {
            "id": 3,
            "name": "Leather Armor",
            "rarity": "Rare",
            "slot": "Chest",
            "maxStack": 1,
            "equipModifiers": [
                { "stat": "Armor", "op": "Flat", "value": 15.0 },
                { "stat": "MaxHealth", "op": "PercentAdd", "value": 0.1 }
            ]
        }
    ])";

    auto result = table.LoadFromJson(json);
    REQUIRE(result.IsOk());
    REQUIRE(result.Get() == true);

    const ItemDef* sword = table.Get(1);
    REQUIRE(sword != nullptr);
    REQUIRE(sword->name == "Rusty Sword");
    REQUIRE(sword->rarity == ItemRarity::Common);
    REQUIRE(sword->slot == EquipSlot::MainHand);
    REQUIRE(sword->maxStack == 1);
    REQUIRE(sword->equipModifiers.size() == 1);
    REQUIRE(sword->equipModifiers[0].stat == StatType::AttackPower);
    REQUIRE(nearlyEqual(sword->equipModifiers[0].value, 5.0f));

    const ItemDef* potion = table.Get(2);
    REQUIRE(potion != nullptr);
    REQUIRE(potion->slot == EquipSlot::None);
    REQUIRE(potion->maxStack == 20);

    const ItemDef* armor = table.Get(3);
    REQUIRE(armor != nullptr);
    REQUIRE(armor->equipModifiers.size() == 2);
    REQUIRE(armor->equipModifiers[1].stat == StatType::MaxHealth);
    REQUIRE(nearlyEqual(armor->equipModifiers[1].value, 0.1f));

    // Malformed JSON should return Error
    String badJson = R"([ { "name": "No ID Item" } ])";
    auto badResult = table.LoadFromJson(badJson);
    REQUIRE(badResult.IsError());
}

TEST_CASE("Items - Inventory Stacking", "[Items][Inventory]") {
    ItemDefTable table;

    ItemDef potion;
    potion.id = 10;
    potion.maxStack = 5;
    table.Register(potion);

    ItemDef sword;
    sword.id = 11;
    sword.maxStack = 1;
    table.Register(sword);

    Inventory inv(3); // 3 slots

    // Add 2 potions
    u32 rem = inv.AddItem(table, 10, 2);
    REQUIRE(rem == 0);
    REQUIRE(inv.CountOf(10) == 2);
    REQUIRE(inv.slots[0].defId == 10);
    REQUIRE(inv.slots[0].count == 2);

    // Add 4 more potions. 3 should fill the first stack, 1 in the next stack.
    rem = inv.AddItem(table, 10, 4);
    REQUIRE(rem == 0);
    REQUIRE(inv.CountOf(10) == 6);
    REQUIRE(inv.slots[0].count == 5);
    REQUIRE(inv.slots[1].defId == 10);
    REQUIRE(inv.slots[1].count == 1);

    // Fill the last slot with a sword
    rem = inv.AddItem(table, 11, 1);
    REQUIRE(rem == 0);

    // Try to add another sword, inventory is full
    rem = inv.AddItem(table, 11, 1);
    REQUIRE(rem == 1);

    // Try to add 5 potions. Only 4 can fit in the second stack. 1 remainder.
    rem = inv.AddItem(table, 10, 5);
    REQUIRE(rem == 1);
    REQUIRE(inv.CountOf(10) == 10);

    // Remove 6 potions
    u32 removed = inv.RemoveItem(10, 6);
    REQUIRE(removed == 6);
    REQUIRE(inv.CountOf(10) == 4);
    // Stack 0 should now be 0 count and empty (slot defId = 0)
    REQUIRE(inv.slots[0].defId == 0);
    REQUIRE(inv.slots[1].count == 4);

    // Remove 5 potions. Only 4 exist.
    removed = inv.RemoveItem(10, 5);
    REQUIRE(removed == 4);
    REQUIRE(inv.CountOf(10) == 0);
    REQUIRE(inv.slots[1].defId == 0);
}

TEST_CASE("Items - Equipment & Stat Modifiers", "[Items][EquipmentOps]") {
    ItemDefTable table;

    ItemDef chest;
    chest.id = 100;
    chest.slot = EquipSlot::Chest;
    chest.equipModifiers.push_back({0, StatType::Armor, ModifierOp::Flat, 20.0f, -1});
    table.Register(chest);

    ItemDef betterChest;
    betterChest.id = 101;
    betterChest.slot = EquipSlot::Chest;
    betterChest.equipModifiers.push_back({0, StatType::Armor, ModifierOp::Flat, 50.0f, -1});
    table.Register(betterChest);

    ItemDef junk;
    junk.id = 999;
    junk.slot = EquipSlot::None;
    table.Register(junk);

    Equipment equip;
    StatSheet stats;
    // Fix deliberate failing state
    // stats.attributes[0] = 999;

    REQUIRE(nearlyEqual(StatCalculator::GetStat(stats, StatType::Armor), 0.0f));

    // Try equipping unequipable item
    auto res = EquipmentOps::Equip(equip, stats, table, 999);
    REQUIRE(res.IsError());

    // Equip chest
    res = EquipmentOps::Equip(equip, stats, table, 100);
    REQUIRE(res.IsOk());
    REQUIRE(res.Get() == 0); // Nothing was equipped before
    REQUIRE(equip.slots[static_cast<u8>(EquipSlot::Chest)] == 100);

    REQUIRE(nearlyEqual(StatCalculator::GetStat(stats, StatType::Armor), 20.0f));

    // Swap chest
    res = EquipmentOps::Equip(equip, stats, table, 101);
    REQUIRE(res.IsOk());
    REQUIRE(res.Get() == 100); // Returned old chest ID
    REQUIRE(equip.slots[static_cast<u8>(EquipSlot::Chest)] == 101);

    REQUIRE(nearlyEqual(StatCalculator::GetStat(stats, StatType::Armor), 50.0f));

    // Unequip
    u32 unequipped = EquipmentOps::Unequip(equip, stats, EquipSlot::Chest);
    REQUIRE(unequipped == 101);
    REQUIRE(equip.slots[static_cast<u8>(EquipSlot::Chest)] == 0);

    REQUIRE(nearlyEqual(StatCalculator::GetStat(stats, StatType::Armor), 0.0f));
}
