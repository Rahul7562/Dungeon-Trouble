#include "Diagnostics/DiagnosticsManager.h"
#include "Diagnostics/Log.h"

namespace DungeonEngine {
namespace Diagnostics {

struct DiagnosticsData {
    std::vector<DiagnosticEvent> events;
    std::mutex mtx;
};

static DiagnosticsData* s_diagData = nullptr;

void DiagnosticsManager::initialize() {
    if (!s_diagData) {
        s_diagData = new DiagnosticsData();
    }
}

void DiagnosticsManager::shutdown() {
    if (s_diagData) {
        delete s_diagData;
        s_diagData = nullptr;
    }
}

void DiagnosticsManager::report(DiagnosticEventType type, std::string_view subsystem, std::string_view message) {
    if (s_diagData) {
        std::lock_guard<std::mutex> lock(s_diagData->mtx);
        s_diagData->events.push_back({type, std::string(subsystem), std::string(message)});
    }

    // Also mirror to log
    switch (type) {
        case DiagnosticEventType::Message:
            DT_LOG_INFO(subsystem, "%.*s", static_cast<int>(message.length()), message.data());
            break;
        case DiagnosticEventType::Warning:
            DT_LOG_WARN(subsystem, "%.*s", static_cast<int>(message.length()), message.data());
            break;
        case DiagnosticEventType::Error:
            DT_LOG_ERROR(subsystem, "%.*s", static_cast<int>(message.length()), message.data());
            break;
        default:
            DT_LOG_WARN(subsystem, "Unknown DiagnosticEventType");
            break;
    }
}

void DiagnosticsManager::reportMessage(std::string_view subsystem, std::string_view message) {
    report(DiagnosticEventType::Message, subsystem, message);
}

void DiagnosticsManager::reportWarning(std::string_view subsystem, std::string_view message) {
    report(DiagnosticEventType::Warning, subsystem, message);
}

void DiagnosticsManager::reportError(std::string_view subsystem, std::string_view message) {
    report(DiagnosticEventType::Error, subsystem, message);
}

std::vector<DiagnosticEvent> DiagnosticsManager::getEvents() {
    if (s_diagData) {
        std::lock_guard<std::mutex> lock(s_diagData->mtx);
        return s_diagData->events;
    }
    return {};
}

void DiagnosticsManager::clearEvents() {
    if (s_diagData) {
        std::lock_guard<std::mutex> lock(s_diagData->mtx);
        s_diagData->events.clear();
    }
}

} // namespace Diagnostics
} // namespace DungeonEngine
