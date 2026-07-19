#include <catch_amalgamated.hpp>
#include <Simulation/SimulationClock.h>
#include <Simulation/SimContext.h>
#include <Simulation/ISimSystem.h>
#include <Simulation/SystemScheduler.h>
#include <Simulation/SimulationLoop.h>
#include <Simulation/SimRandom.h>
#include <vector>
#include <string>
#include <memory>

using namespace DungeonEngine;
using namespace Core;

class MockSystem : public ISimSystem {
public:
    MockSystem(std::string name, std::vector<std::string>& executionLog)
        : m_name(std::move(name)), m_executionLog(executionLog) {}

    void Tick(SimContext& context) override {
        m_executionLog.push_back(m_name);
        m_lastTickContext = context;
    }

    const char* GetName() const override { return m_name.c_str(); }

    SimContext m_lastTickContext{};
private:
    std::string m_name;
    std::vector<std::string>& m_executionLog;
};

TEST_CASE("SimulationClock Tick Generation", "[Simulation]") {
    // 30 Hz tick rate
    SimulationClock clock(30.0, 5);

    // We expect cap max ticks per advance. 1.0 seconds at 30Hz cap is 5.
    u32 ticks = clock.Advance(1.0);
    REQUIRE(ticks == 5); // Hits cap

    // Advance 1/30 seconds should yield 1 tick
    ticks = clock.Advance(1.0/30.0);
    REQUIRE(ticks == 1);

    // Tick number monotonicity
    REQUIRE(clock.GetTickNumber() == 0);
    clock.IncrementTick();
    REQUIRE(clock.GetTickNumber() == 1);
}

TEST_CASE("SimulationLoop Execution & Determinism", "[Simulation]") {
    std::vector<std::string> log1, log2;
    SimulationLoop loop1(12345, 30.0, 5);
    SimulationLoop loop2(12345, 30.0, 5);

    loop1.GetScheduler().AddSystem(std::make_unique<MockSystem>("SysA", log1), 1);
    loop2.GetScheduler().AddSystem(std::make_unique<MockSystem>("SysA", log2), 1);

    loop1.Update(0.1); // 3 ticks (0.1 / (1/30) = 3)
    loop2.Update(0.1);

    REQUIRE(log1.size() == 3);
    REQUIRE(log2.size() == 3);
    REQUIRE(loop1.GetClock().GetTickNumber() == 3);
    REQUIRE(loop2.GetClock().GetTickNumber() == 3);

    // Check internal states are same
}

TEST_CASE("SystemScheduler Ordering", "[Simulation]") {
    SystemScheduler scheduler;
    std::vector<std::string> log;

    scheduler.AddSystem(std::make_unique<MockSystem>("Phase2_B", log), 2);
    scheduler.AddSystem(std::make_unique<MockSystem>("Phase1_A", log), 1);
    scheduler.AddSystem(std::make_unique<MockSystem>("Phase2_A", log), 2); // Added after Phase2_B

    SimContext ctx{};
    scheduler.TickAll(ctx);

    REQUIRE(log.size() == 3);
    REQUIRE(log[0] == "Phase1_A"); // Lowest phase first
    REQUIRE(log[1] == "Phase2_B"); // Phase 2, added first
    REQUIRE(log[2] == "Phase2_A"); // Phase 2, added second
}

TEST_CASE("SimRandom Reproducibility", "[Simulation]") {
    SimRandom rand1(42);
    SimRandom rand2(42);
    SimRandom rand3(1337);

    REQUIRE(rand1.NextUInt32() == rand2.NextUInt32());
    REQUIRE(rand1.NextFloat01() == rand2.NextFloat01());
    REQUIRE(rand1.NextRange(1, 100) == rand2.NextRange(1, 100));

    // Resetting for unequal check
    SimRandom rand1_reset(42);
    REQUIRE(rand1_reset.NextUInt32() != rand3.NextUInt32());
}

TEST_CASE("SimulationLoop Seed Determinism", "[Simulation]") {
    std::vector<std::string> log1, log2;
    SimulationLoop loop1(999, 30.0, 5);
    SimulationLoop loop2(999, 30.0, 5);

    auto sys1 = new MockSystem("Sys1", log1);
    auto sys2 = new MockSystem("Sys2", log2);

    loop1.GetScheduler().AddSystem(std::unique_ptr<MockSystem>(sys1), 1);
    loop2.GetScheduler().AddSystem(std::unique_ptr<MockSystem>(sys2), 1);

    loop1.Update(0.1);
    loop2.Update(0.1);

    REQUIRE(sys1->m_lastTickContext.randomSeed == sys2->m_lastTickContext.randomSeed);
}
