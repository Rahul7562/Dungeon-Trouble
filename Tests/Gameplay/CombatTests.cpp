#include <catch_amalgamated.hpp>

#include <Gameplay/Combat/Components.h>
#include <Gameplay/Combat/Events.h>
#include <Gameplay/Combat/DamagePipeline.h>
#include <Gameplay/Combat/CombatSystem.h>
#include <Gameplay/Combat/HitQuery.h>
#include <Gameplay/Stats/StatSheet.h>
#include <Gameplay/Stats/StatCalculator.h>
#include <ECS/Registry.h>
#include <Events/EventBus.h>
#include <Simulation/SimContext.h>
#include <Math/MathUtils.h>

using namespace DungeonEngine::Gameplay;
using namespace DungeonEngine::ECS;
using namespace DungeonEngine;
using namespace DungeonEngine::Math;
using namespace Core;

TEST_CASE("DamagePipeline calculations", "[Gameplay][Combat]") {
    StatSheet sourceStats;
    StatSheet targetStats;
    SimRandom rng(12345);

    // Set up source stats
    StatCalculator::AddModifier(sourceStats, {1, StatType::AttackPower, ModifierOp::Flat, 100.0f, -1});
    StatCalculator::AddModifier(sourceStats, {2, StatType::SpellPower, ModifierOp::Flat, 200.0f, -1});
    StatCalculator::AddModifier(sourceStats, {3, StatType::CritChance, ModifierOp::Flat, 50.0f, -1});
    StatCalculator::AddModifier(sourceStats, {4, StatType::CritMultiplier, ModifierOp::Flat, 200.0f, -1}); // +200 flat means 200 multiplier, 2x

    // Set up target stats
    StatCalculator::AddModifier(targetStats, {1, StatType::Armor, ModifierOp::Flat, 100.0f, -1}); // 100 / (100 + 100) = 50% reduction

    SECTION("Physical without crit or armor bypass") {
        DamageEvent e{};
        e.baseAmount = 50.0f;
        e.school = DamageSchool::Physical;
        e.flags = 0;

        // Base 50 + AP(100)*0.5 = 100.
        // Armor reduction: 50%. Final = 50.
        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(nearlyEqual(res.amount, 50.0f));
        REQUIRE(res.crit == false);
    }

    SECTION("Magic passes through armor") {
        DamageEvent e{};
        e.baseAmount = 50.0f;
        e.school = DamageSchool::Fire;
        e.flags = 0;

        // Base 50 + SP(200)*0.5 = 150.
        // No armor reduction for magic.
        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(nearlyEqual(res.amount, 150.0f));
    }

    SECTION("Physical IgnoreArmor bypasses armor") {
        DamageEvent e{};
        e.baseAmount = 50.0f;
        e.school = DamageSchool::Physical;
        e.flags = DamageEvent::FLAG_IGNORE_ARMOR;

        // Base 50 + AP(100)*0.5 = 100.
        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(nearlyEqual(res.amount, 100.0f));
    }

    SECTION("TrueDamage bypasses mitigation") {
        DamageEvent e{};
        e.baseAmount = 50.0f;
        e.school = DamageSchool::Physical;
        e.flags = DamageEvent::FLAG_TRUE_DAMAGE;

        // Base 50 + AP(100)*0.5 = 100.
        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(nearlyEqual(res.amount, 100.0f));
    }

    SECTION("Clamp at 0") {
        DamageEvent e{};
        e.baseAmount = -500.0f; // negative base damage
        e.school = DamageSchool::Physical;
        e.flags = 0;

        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(nearlyEqual(res.amount, 0.0f));
    }

    SECTION("Crit forcing via seed selection") {
        // RNG seed 1 gives next float < 0.5? Let's force crit by setting chance to 100
        StatCalculator::AddModifier(sourceStats, {5, StatType::CritChance, ModifierOp::Flat, 100.0f, -1}); // 150% chance

        DamageEvent e{};
        e.baseAmount = 50.0f;
        e.school = DamageSchool::Physical;
        e.flags = DamageEvent::FLAG_CAN_CRIT | DamageEvent::FLAG_IGNORE_ARMOR;

        // Base: 50 + AP(100)*0.5 = 100
        // Crit (3.5x, base 150 + 200): 350
        auto res = DamagePipeline::Resolve(e, sourceStats, targetStats, rng);
        REQUIRE(res.crit == true);
        REQUIRE(nearlyEqual(res.amount, 350.0f));
    }
}

TEST_CASE("CombatSystem handles DamageEvents, Determinism, and Death", "[Gameplay][Combat]") {
    Registry reg;
    EventBus bus;

    auto s1 = reg.Create();
    reg.AddComponent<StatSheet>(s1);

    auto t1 = reg.Create();
    reg.AddComponent<StatSheet>(t1);
    reg.AddComponent<Health>(t1, 100.0f, 100.0f);

    CombatSystem sys(&reg, &bus);

    SECTION("Basic Damage Processing") {
        DamageEvent e{};
        e.source = s1;
        e.target = t1;
        e.baseAmount = 30.0f;
        e.school = DamageSchool::Physical;
        e.flags = DamageEvent::FLAG_IGNORE_ARMOR;

        sys.QueueDamage(e);

        SimContext ctx{1, 0.033f, 42};
        sys.Tick(ctx);

        auto* h = reg.GetComponent<Health>(t1);
        REQUIRE(h != nullptr);
        REQUIRE(nearlyEqual(h->current, 70.0f)); // 100 - 30

        // Check EventBus for DamageAppliedEvent
        bool gotDamageEvent = false;
        bus.Subscribe<DamageAppliedEvent>([&](const DamageAppliedEvent& ev) {
            if (ev.target == t1) gotDamageEvent = true;
        });
        bus.DispatchQueue(EventChannel::GAMEPLAY);
        REQUIRE(gotDamageEvent);
    }

    SECTION("Death and DeadTag") {
        DamageEvent e{};
        e.source = s1;
        e.target = t1;
        e.baseAmount = 150.0f;
        e.school = DamageSchool::Physical;
        e.flags = DamageEvent::FLAG_IGNORE_ARMOR;

        sys.QueueDamage(e);

        SimContext ctx{1, 0.033f, 42};
        sys.Tick(ctx);

        auto* h = reg.GetComponent<Health>(t1);
        REQUIRE(h != nullptr);
        REQUIRE(nearlyEqual(h->current, 0.0f));
        REQUIRE(reg.HasComponent<DeadTag>(t1));

        int deathEvents = 0;
        bus.Subscribe<EntityDiedEvent>([&](const EntityDiedEvent& ev) {
            if (ev.entity == t1) deathEvents++;
        });
        bus.DispatchQueue(EventChannel::GAMEPLAY);
        REQUIRE(deathEvents == 1);

        // Second hit should be ignored because of DeadTag
        sys.QueueDamage(e);
        sys.Tick(ctx);

        int moreDeathEvents = 0;
        bus.Subscribe<EntityDiedEvent>([&](const EntityDiedEvent& ev) {
            if (ev.entity == t1) moreDeathEvents++;
        });
        bus.ClearAllQueues(); // Clear previous
        sys.QueueDamage(e);
        sys.Tick(ctx);
        bus.DispatchQueue(EventChannel::GAMEPLAY);
        REQUIRE(moreDeathEvents == 0); // No second death event
    }

    SECTION("Determinism check") {
        Registry regA, regB;
        EventBus busA, busB;
        auto sA = regA.Create(), sB = regB.Create();
        regA.AddComponent<StatSheet>(sA); regB.AddComponent<StatSheet>(sB);
        auto tA = regA.Create(), tB = regB.Create();
        regA.AddComponent<StatSheet>(tA); regB.AddComponent<StatSheet>(tB);
        regA.AddComponent<Health>(tA, 100.0f, 100.0f); regB.AddComponent<Health>(tB, 100.0f, 100.0f);

        CombatSystem sysA(&regA, &busA), sysB(&regB, &busB);

        DamageEvent eA{}, eB{};
        eA.source = sA; eA.target = tA; eA.baseAmount = 40.0f; eA.school = DamageSchool::Physical; eA.flags = DamageEvent::FLAG_CAN_CRIT;
        eB.source = sB; eB.target = tB; eB.baseAmount = 40.0f; eB.school = DamageSchool::Physical; eB.flags = DamageEvent::FLAG_CAN_CRIT;

        sysA.QueueDamage(eA); sysB.QueueDamage(eB);

        SimContext ctxA{1, 0.033f, 999};
        SimContext ctxB{1, 0.033f, 999};

        sysA.Tick(ctxA); sysB.Tick(ctxB);

        auto* hA = regA.GetComponent<Health>(tA);
        auto* hB = regB.GetComponent<Health>(tB);
        REQUIRE(hA->current == hB->current); // EXACT match, not nearlyEqual

        float finalA = 0; float finalB = 0;
        busA.Subscribe<DamageAppliedEvent>([&](const DamageAppliedEvent& ev) { finalA = ev.finalAmount; });
        busB.Subscribe<DamageAppliedEvent>([&](const DamageAppliedEvent& ev) { finalB = ev.finalAmount; });
        busA.DispatchQueue(EventChannel::GAMEPLAY);
        busB.DispatchQueue(EventChannel::GAMEPLAY);

        REQUIRE(finalA == finalB); // EXACT match
    }
}

TEST_CASE("HitQuery overlap and collection", "[Gameplay][Combat]") {
    SECTION("Overlaps: Circle-Circle") {
        HitShape c1{HitShape::Kind::Circle, 0, 0, 5, 0, 0};
        HitShape c2{HitShape::Kind::Circle, 8, 0, 5, 0, 0}; // distance 8, radSum 10 -> overlap
        HitShape c3{HitShape::Kind::Circle, 12, 0, 5, 0, 0}; // distance 12, radSum 10 -> no overlap
        REQUIRE(HitQuery::Overlaps(c1, c2));
        REQUIRE(!HitQuery::Overlaps(c1, c3));
    }

    SECTION("Overlaps: AABB-AABB") {
        HitShape b1{HitShape::Kind::AABB, 0, 0, 0, 5, 5};
        HitShape b2{HitShape::Kind::AABB, 8, 0, 0, 5, 5}; // diff 8, halfSum 10 -> overlap
        HitShape b3{HitShape::Kind::AABB, 12, 0, 0, 5, 5}; // diff 12, halfSum 10 -> no overlap
        REQUIRE(HitQuery::Overlaps(b1, b2));
        REQUIRE(!HitQuery::Overlaps(b1, b3));
    }

    SECTION("Overlaps: Circle-AABB") {
        HitShape c{HitShape::Kind::Circle, 0, 0, 5, 0, 0};
        HitShape b1{HitShape::Kind::AABB, 8, 0, 0, 5, 5}; // circle touches AABB (dist 8, AABB half 5 -> closest X is 3, dist 3 < radius 5)
        HitShape b2{HitShape::Kind::AABB, 12, 0, 0, 5, 5}; // closest X is 7, dist 7 > radius 5
        REQUIRE(HitQuery::Overlaps(c, b1));
        REQUIRE(!HitQuery::Overlaps(c, b2));
        REQUIRE(HitQuery::Overlaps(b1, c)); // commutative
    }

    SECTION("CollectOverlapping excludes TeamId") {
        Registry reg;
        auto e1 = reg.Create();
        reg.AddComponent<HitShape>(e1, HitShape::Kind::Circle, 0.0f, 0.0f, 5.0f, 0.0f, 0.0f);
        reg.AddComponent<TeamId>(e1, 1u);

        auto e2 = reg.Create();
        reg.AddComponent<HitShape>(e2, HitShape::Kind::Circle, 2.0f, 2.0f, 5.0f, 0.0f, 0.0f);
        reg.AddComponent<TeamId>(e2, 2u); // Enemy

        auto e3 = reg.Create();
        reg.AddComponent<HitShape>(e3, HitShape::Kind::Circle, 20.0f, 20.0f, 5.0f, 0.0f, 0.0f); // Too far
        reg.AddComponent<TeamId>(e3, 2u);

        HitShape queryArea{HitShape::Kind::Circle, 0, 0, 10, 0, 0};
        TeamId myTeam{1};

        std::vector<Entity> hits;
        HitQuery::CollectOverlapping(reg, queryArea, myTeam, hits);

        REQUIRE(hits.size() == 1);
        REQUIRE(hits[0] == e2); // e1 is my team, e3 is too far
    }
}
