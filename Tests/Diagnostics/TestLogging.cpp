#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Diagnostics/Log.h"
#include "Diagnostics/DiagnosticsManager.h"
#include <fstream>
#include <filesystem>

using namespace DungeonEngine::Diagnostics;

TEST_CASE("Logger Initialization and Global Level", "[Logging]") {
    Logger::initialize();

    // We can't easily capture stdout without modifying sink structure for tests,
    // but we can verify it doesn't crash.
    REQUIRE_NOTHROW(Logger::setGlobalLevel(LogLevel::Warning));
    REQUIRE_NOTHROW(DT_LOG_INFO("Test", "This should be filtered out"));
    REQUIRE_NOTHROW(DT_LOG_ERROR("Test", "This should print"));

    Logger::shutdown();
}

TEST_CASE("DiagnosticsManager Event Recording", "[Diagnostics]") {
    DiagnosticsManager::initialize();
    Logger::initialize(); // required because diagnostics also logs

    DiagnosticsManager::clearEvents();

    DiagnosticsManager::reportMessage("TestSys", "A message");
    DiagnosticsManager::reportWarning("TestSys", "A warning");
    DiagnosticsManager::reportError("TestSys", "An error");

    auto events = DiagnosticsManager::getEvents();
    REQUIRE(events.size() == 3);

    REQUIRE(events[0].type == DiagnosticEventType::Message);
    REQUIRE(events[0].subsystem == "TestSys");
    REQUIRE(events[0].message == "A message");

    REQUIRE(events[2].type == DiagnosticEventType::Error);

    Logger::shutdown();
    DiagnosticsManager::shutdown();
}
