#include <catch_amalgamated.hpp>
#include <Gameplay/Abilities/AbilitySystem.h>
#include <Gameplay/Abilities/StatusEffectSystem.h>
#include <Gameplay/Abilities/AbilityComponents.h>
#include <Gameplay/Abilities/AbilityEvents.h>
#include <Gameplay/Combat/Components.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <ECS/Registry.h>
#include <ECS/EntityRegistry.h>
#include <Events/EventBus.h>
#include <Simulation/SimContext.h>
#include <Math/MathUtils.h>
#include <memory>
#include <iostream>

using namespace DungeonEngine;
using namespace DungeonEngine::Gameplay;

TEST_CASE("Abilities - Cast Success", "[Abilities]") {
    ECS::Registry registry;
    EventBus eventBus;
    CombatSystem combatSystem(&registry, &eventBus);
    AbilityDefTable abilityTable;
    StatusEffectDefTable statusTable;
    AbilitySystem abilitySystem(&registry, &eventBus, &combatSystem, &abilityTable, &statusTable);

    // Register ability
    AbilityDef fireball;
    fireball.id = 1;
    fireball.name = "Fireball";
    fireball.baseDamage = 50.0f;
    fireball.school = DamageSchool::Fire;
    fireball.damageFlags = DamageEvent::FLAG_CAN_CRIT;
    fireball.cooldownTicks = 100;
    fireball.manaCost = 20.0f;
    fireball.range = 100.0f;
    fireball.appliesStatusId = 0;
    abilityTable.Register(fireball);

    ECS::Entity caster = registry.Create();
    registry.AddComponent<AbilityBook>(caster, AbilityBook{{1}, {}});
    registry.AddComponent<Mana>(caster, Mana{100.0f, 100.0f});
    // Add CDR stat
    StatSheet sheet;
    StatModifier cdrMod{100, StatType::CooldownReduction, ModifierOp::Flat, 20.0f, -1};
    StatCalculator::AddModifier(sheet, cdrMod);
    registry.AddComponent<StatSheet>(caster, sheet);

    ECS::Entity target = registry.Create();
    registry.AddComponent<Health>(target, Health{200.0f, 200.0f});

    // Subscribe to event
    bool eventFired = false;
    eventBus.Subscribe<AbilityCastEvent>([&](const AbilityCastEvent& e) {
        if (e.abilityId == 1 && e.caster == caster && e.target == target) {
            eventFired = true;
        }
    });

    SimContext context;
    context.tickNumber = 10;

    // Cast
    abilitySystem.QueueCast({caster, 1, target});
    abilitySystem.Tick(context);

    eventBus.DispatchQueue(EventChannel::GAMEPLAY);

    auto stats = abilitySystem.GetLastTickStats();
    REQUIRE(stats.casts == 1);
    REQUIRE(stats.rejected == 0);

    // Mana deducted
    REQUIRE(Math::nearlyEqual(registry.GetComponent<Mana>(caster)->current, 80.0f));

    // Cooldown set with 20% CDR (100 -> 80 ticks) -> ready at tick 10 + 80 = 90
    auto* book = registry.GetComponent<AbilityBook>(caster);
    REQUIRE(book->cooldownReadyAtTick[1] == 90);

    // Event emitted
    REQUIRE(eventFired);
}

TEST_CASE("Abilities - Rejections", "[Abilities]") {
    ECS::Registry registry;
    EventBus eventBus;
    CombatSystem combatSystem(&registry, &eventBus);
    AbilityDefTable abilityTable;
    StatusEffectDefTable statusTable;
    AbilitySystem abilitySystem(&registry, &eventBus, &combatSystem, &abilityTable, &statusTable);

    AbilityDef strike;
    strike.id = 1;
    strike.name = "Strike";
    strike.baseDamage = 10.0f;
    strike.school = DamageSchool::Physical;
    strike.damageFlags = 0;
    strike.cooldownTicks = 50;
    strike.manaCost = 10.0f;
    strike.range = 50.0f;
    strike.appliesStatusId = 0;
    abilityTable.Register(strike);

    ECS::Entity caster = registry.Create();
    registry.AddComponent<AbilityBook>(caster, AbilityBook{{1}, {}});
    registry.AddComponent<Mana>(caster, Mana{5.0f, 100.0f}); // not enough mana

    ECS::Entity target = registry.Create();

    SimContext context;
    context.tickNumber = 100;

    // 1. Unknown ability
    abilitySystem.QueueCast({caster, 999, target});
    abilitySystem.Tick(context);
    REQUIRE(abilitySystem.GetLastTickStats().rejected == 1);

    // 2. Insufficient mana
    abilitySystem.QueueCast({caster, 1, target});
    abilitySystem.Tick(context);
    REQUIRE(abilitySystem.GetLastTickStats().rejected == 1);

    // Give mana, but on cooldown
    registry.GetComponent<Mana>(caster)->current = 100.0f;
    registry.GetComponent<AbilityBook>(caster)->cooldownReadyAtTick[1] = 150;
    abilitySystem.QueueCast({caster, 1, target});
    abilitySystem.Tick(context);
    REQUIRE(abilitySystem.GetLastTickStats().rejected == 1);

    // Clear cooldown, but stunned
    registry.GetComponent<AbilityBook>(caster)->cooldownReadyAtTick[1] = 0;
    registry.AddComponent<StunnedTag>(caster);
    abilitySystem.QueueCast({caster, 1, target});
    abilitySystem.Tick(context);
    REQUIRE(abilitySystem.GetLastTickStats().rejected == 1);
}

TEST_CASE("Status Effects - DoT Timing and Damage", "[Abilities]") {
    ECS::Registry registry;
    EventBus eventBus;
    CombatSystem combatSystem(&registry, &eventBus);
    StatusEffectDefTable statusTable;
    StatusEffectSystem statusSystem(&registry, &combatSystem, &statusTable);

    StatusEffectDef dotDef;
    dotDef.id = 1;
    dotDef.name = "Poison";
    dotDef.kind = StatusKind::DamageOverTime;
    dotDef.magnitudePerTick = 5.0f;
    dotDef.school = DamageSchool::Physical;
    dotDef.durationTicks = 30; // 3 ticks
    dotDef.tickInterval = 10;
    statusTable.Register(dotDef);

    ECS::Entity target = registry.Create();
    registry.AddComponent<Health>(target, Health{100.0f, 100.0f});
    registry.AddComponent<StatSheet>(target, StatSheet{});
    ECS::Entity source = registry.Create();
    registry.AddComponent<StatSheet>(source, StatSheet{});
    registry.AddComponent<ActiveStatusEffects>(target, ActiveStatusEffects{{{1, source, 30, 10}}});

    SimContext context;
    context.tickNumber = 1;

    int totalDamageEvents = 0;
    eventBus.Subscribe<DamageEvent>([&](const DamageEvent& e) {
        if (e.target == target) totalDamageEvents++;
    });

    for (int i = 0; i < 35; i++) {
        statusSystem.Tick(context);

        // We'll just pump the combat system to clear its queue, but we intercept it.
        // Oh wait, combat system doesn't emit DamageEvent, it processes it.
        // Wait, the prompt says "DoT: status applies, ticks exactly at tickInterval boundaries... total damage equals expected"
        // Let's rely on Health changing by pumping combat system.
        combatSystem.Tick(context);
    }

    // Poison should have ticked 3 times: 15 damage
    // Note: The DamagePipeline might scale the damage. With 0 stats, Physical adds 0.5 * AttackPower, Spell adds 0.5 * SpellPower.
    // If we have 0 stats, amount is just baseAmount.
    // Mitigation: If Physical, mitigated by Armor. Since Armor is 0, it's 0 mitigation.
    // We should expect exactly 15 damage if both have 0 stats and it goes through normal DamagePipeline.
    // But wait! DamagePipeline::Resolve requires StatSheets on both source and target.
    // Does CombatSystem skip damage if missing StatSheets? Let's add them just in case.
    REQUIRE(Math::nearlyEqual(registry.GetComponent<Health>(target)->current, 85.0f));

    // Status should be removed
    REQUIRE(registry.GetComponent<ActiveStatusEffects>(target)->effects.empty());
}

TEST_CASE("Status Effects - Stun Tag Lifecycle", "[Abilities]") {
    ECS::Registry registry;
    EventBus eventBus;
    CombatSystem combatSystem(&registry, &eventBus);
    AbilityDefTable abilityTable;
    StatusEffectDefTable statusTable;
    AbilitySystem abilitySystem(&registry, &eventBus, &combatSystem, &abilityTable, &statusTable);
    StatusEffectSystem statusSystem(&registry, &combatSystem, &statusTable);

    StatusEffectDef stunDef;
    stunDef.id = 10;
    stunDef.name = "Bash Stun";
    stunDef.kind = StatusKind::Stun;
    stunDef.durationTicks = 5;
    stunDef.tickInterval = 1;
    statusTable.Register(stunDef);

    AbilityDef bash;
    bash.id = 20;
    bash.name = "Bash";
    bash.baseDamage = 0.0f;
    bash.manaCost = 0.0f;
    bash.cooldownTicks = 0;
    bash.range = 100.0f;
    bash.appliesStatusId = 10;
    abilityTable.Register(bash);

    ECS::Entity caster = registry.Create();
    registry.AddComponent<AbilityBook>(caster, AbilityBook{{20}, {}});

    ECS::Entity target = registry.Create();

    SimContext context;
    context.tickNumber = 1;

    abilitySystem.QueueCast({caster, 20, target});
    abilitySystem.Tick(context);

    REQUIRE(registry.HasComponent<StunnedTag>(target));

    for (int i = 0; i < 5; i++) {
        statusSystem.Tick(context);
    }

    REQUIRE_FALSE(registry.HasComponent<StunnedTag>(target));
}

TEST_CASE("Status Effects - StatBuff Apply and Revert", "[Abilities]") {
    ECS::Registry registry;
    EventBus eventBus;
    CombatSystem combatSystem(&registry, &eventBus);
    AbilityDefTable abilityTable;
    StatusEffectDefTable statusTable;
    AbilitySystem abilitySystem(&registry, &eventBus, &combatSystem, &abilityTable, &statusTable);
    StatusEffectSystem statusSystem(&registry, &combatSystem, &statusTable);

    StatusEffectDef buffDef;
    buffDef.id = 50;
    buffDef.name = "Empower";
    buffDef.kind = StatusKind::StatBuff;
    buffDef.durationTicks = 10;
    buffDef.tickInterval = 1;
    buffDef.statModifier = StatModifier{0, StatType::AttackPower, ModifierOp::Flat, 50.0f, 10};
    statusTable.Register(buffDef);

    AbilityDef empower;
    empower.id = 60;
    empower.name = "Empower Spell";
    empower.baseDamage = 0.0f;
    empower.manaCost = 0.0f;
    empower.cooldownTicks = 0;
    empower.range = 100.0f;
    empower.appliesStatusId = 50;
    abilityTable.Register(empower);

    ECS::Entity caster = registry.Create();
    registry.AddComponent<AbilityBook>(caster, AbilityBook{{60}, {}});

    ECS::Entity target = registry.Create();
    registry.AddComponent<StatSheet>(target, StatSheet{});

    SimContext context;

    abilitySystem.QueueCast({caster, 60, target});
    abilitySystem.Tick(context);

    auto* sheet = registry.GetComponent<StatSheet>(target);
    REQUIRE(Math::nearlyEqual(StatCalculator::GetStat(*sheet, StatType::AttackPower), 50.0f));

    for (int i = 0; i < 10; i++) {
        statusSystem.Tick(context);
    }

    REQUIRE(Math::nearlyEqual(StatCalculator::GetStat(*sheet, StatType::AttackPower), 0.0f));
}

TEST_CASE("Abilities - Determinism", "[Abilities]") {
    auto runSim = [](Core::u64 seed) -> std::vector<Core::f32> {
        ECS::Registry registry;
        EventBus eventBus;
        CombatSystem combatSystem(&registry, &eventBus);
        AbilityDefTable abilityTable;
        StatusEffectDefTable statusTable;
        AbilitySystem abilitySystem(&registry, &eventBus, &combatSystem, &abilityTable, &statusTable);
        StatusEffectSystem statusSystem(&registry, &combatSystem, &statusTable);

        AbilityDef fire;
        fire.id = 1;
        fire.name = "Fire";
        fire.baseDamage = 20.0f;
        fire.school = DamageSchool::Fire;
        fire.damageFlags = DamageEvent::FLAG_CAN_CRIT; // Causes RNG dependency
        fire.cooldownTicks = 0;
        fire.manaCost = 0.0f;
        fire.range = 100.0f;
        fire.appliesStatusId = 0;
        abilityTable.Register(fire);

        ECS::Entity caster = registry.Create();
        registry.AddComponent<AbilityBook>(caster, AbilityBook{{1}, {}});

        StatSheet casterStats;
        StatModifier critMod{100, StatType::CritChance, ModifierOp::Flat, 50.0f, -1};
        StatModifier critMultMod{101, StatType::CritMultiplier, ModifierOp::Flat, 2.0f, -1};
        StatCalculator::AddModifier(casterStats, critMod);
        StatCalculator::AddModifier(casterStats, critMultMod);
        registry.AddComponent<StatSheet>(caster, casterStats);

        std::vector<ECS::Entity> targets;
        for (int i = 0; i < 10; ++i) {
            ECS::Entity target = registry.Create();
            registry.AddComponent<Health>(target, Health{1000.0f, 1000.0f});
            registry.AddComponent<StatSheet>(target, StatSheet{});
            targets.push_back(target);
        }

        SimContext context;
        context.randomSeed = seed;

        for (int tick = 0; tick < 10; ++tick) {
            context.tickNumber = tick;
            for (auto t : targets) {
                abilitySystem.QueueCast({caster, 1, t});
            }
            abilitySystem.Tick(context);
            combatSystem.Tick(context);
            statusSystem.Tick(context);
            eventBus.DispatchQueue(EventChannel::GAMEPLAY);
        }

        std::vector<Core::f32> healths;
        for (auto t : targets) {
            healths.push_back(registry.GetComponent<Health>(t)->current);
        }
        return healths;
    };

    auto run1 = runSim(12345);
    auto run2 = runSim(12345);
    auto run3 = runSim(99999);

    REQUIRE(run1 == run2); // Should be exactly identical
    REQUIRE(run1 != run3); // Different seed should have different crits
}
