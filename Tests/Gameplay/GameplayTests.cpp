#define CATCH_CONFIG_MAIN
#include <catch_amalgamated.hpp>

#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <Math/MathUtils.h>
#include <ECS/Registry.h>

using namespace DungeonEngine::Gameplay;
using namespace DungeonEngine::ECS;
using namespace Core;
using namespace DungeonEngine::Math;

TEST_CASE("Derived-stat formulas verified for a known attribute set", "[Gameplay][Stats]") {
    StatSheet sheet;
    sheet.attributes[static_cast<u8>(AttributeType::STR)] = 10;
    sheet.attributes[static_cast<u8>(AttributeType::DEX)] = 20;
    sheet.attributes[static_cast<u8>(AttributeType::INT)] = 15;
    sheet.attributes[static_cast<u8>(AttributeType::VIT)] = 25;

    // BaseMaxHealth = 50 + 25*10 = 300
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MaxHealth), 300.0f));

    // BaseMaxMana = 30 + 15*8 = 150
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MaxMana), 150.0f));

    // AttackPower = STR*2 + DEX = 10*2 + 20 = 40
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::AttackPower), 40.0f));

    // SpellPower = INT*2 = 15*2 = 30
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::SpellPower), 30.0f));

    // Armor = STR*0.5 + DEX*0.5 = 10*0.5 + 20*0.5 = 15
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Armor), 15.0f));

    // Evasion = DEX*0.3 = 20*0.3 = 6
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Evasion), 6.0f));

    // CritChance = 5 + DEX*0.1 = 5 + 2 = 7
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::CritChance), 7.0f));

    // CritMultiplier = 150
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::CritMultiplier), 150.0f));

    // MoveSpeed = 100
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MoveSpeed), 100.0f));

    // CooldownReduction = 0
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::CooldownReduction), 0.0f));
}

TEST_CASE("Flat/PercentAdd/PercentMult stacking order verified", "[Gameplay][Stats]") {
    StatSheet sheet;
    sheet.attributes[static_cast<u8>(AttributeType::VIT)] = 0;
    // BaseMaxHealth = 50

    StatCalculator::AddModifier(sheet, {1, StatType::MaxHealth, ModifierOp::Flat, 25.0f, -1});
    // Base + Flat = 50 + 25 = 75

    StatCalculator::AddModifier(sheet, {2, StatType::MaxHealth, ModifierOp::PercentAdd, 10.0f, -1});
    // (Base + Flat) * (1 + sum(PercentAdd)/100) = 75 * 1.1 = 82.5

    StatCalculator::AddModifier(sheet, {3, StatType::MaxHealth, ModifierOp::PercentMult, 20.0f, -1});
    // ... * product(1 + PercentMult/100) = 82.5 * 1.2 = 99.0

    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MaxHealth), 99.0f));
}

TEST_CASE("Modifiers from multiple sources add and remove-by-source correctly", "[Gameplay][Stats]") {
    StatSheet sheet;

    // Default Base MoveSpeed = 100
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MoveSpeed), 100.0f));

    // Source 10 adds 20 flat
    StatCalculator::AddModifier(sheet, {10, StatType::MoveSpeed, ModifierOp::Flat, 20.0f, -1});
    // Source 11 adds 50% mult
    StatCalculator::AddModifier(sheet, {11, StatType::MoveSpeed, ModifierOp::PercentMult, 50.0f, -1});

    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MoveSpeed), 180.0f));

    // Remove source 10
    StatCalculator::RemoveModifiersFromSource(sheet, 10);
    // Base 100 * 1.5 = 150
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MoveSpeed), 150.0f));

    // Remove source 11
    StatCalculator::RemoveModifiersFromSource(sheet, 11);
    // Back to base
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::MoveSpeed), 100.0f));
}

TEST_CASE("Temporary modifier expires after N TickModifiers calls", "[Gameplay][Stats]") {
    StatSheet sheet;

    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Armor), 0.0f));

    // Add modifier for 2 ticks
    StatCalculator::AddModifier(sheet, {1, StatType::Armor, ModifierOp::Flat, 100.0f, 2});

    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Armor), 100.0f));

    StatCalculator::TickModifiers(sheet);
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Armor), 100.0f));

    StatCalculator::TickModifiers(sheet); // expires here
    REQUIRE(nearlyEqual(StatCalculator::GetStat(sheet, StatType::Armor), 0.0f));
}

TEST_CASE("Dirty-flag laziness", "[Gameplay][Stats]") {
    StatSheet sheet;

    // Initial read sets isDirty = false
    Core::f32 v1 = StatCalculator::GetStat(sheet, StatType::MaxHealth);
    REQUIRE(sheet.isDirty == false);

    // Adding modifier sets isDirty = true
    StatCalculator::AddModifier(sheet, {1, StatType::MaxHealth, ModifierOp::Flat, 50.0f, -1});
    REQUIRE(sheet.isDirty == true);

    // Next read recalculates and sets isDirty = false
    Core::f32 v2 = StatCalculator::GetStat(sheet, StatType::MaxHealth);
    REQUIRE(sheet.isDirty == false);
    REQUIRE(v2 > v1);
}

TEST_CASE("StatSheet works as an ECS component via Registry", "[Gameplay][Stats]") {
    Registry registry;
    Entity e = registry.Create();

    // Add component
    registry.AddComponent<StatSheet>(e);
    REQUIRE(registry.HasComponent<StatSheet>(e) == true);

    // Mutate through GetComponent
    StatSheet* sheet = registry.GetComponent<StatSheet>(e);
    REQUIRE(sheet != nullptr);

    StatCalculator::AddModifier(*sheet, {1, StatType::AttackPower, ModifierOp::Flat, 100.0f, -1});

    // Verify
    StatSheet* sheet2 = registry.GetComponent<StatSheet>(e);
    REQUIRE(nearlyEqual(StatCalculator::GetStat(*sheet2, StatType::AttackPower), 100.0f));
}
