#pragma once

#include <string_view>
#include <vector>
#include <string>
#include <mutex>

namespace DungeonEngine {
namespace Diagnostics {

enum class DiagnosticEventType {
    Message,
    Warning,
    Error
};

struct DiagnosticEvent {
    DiagnosticEventType type;
    std::string subsystem;
    std::string message;
};

class DiagnosticsManager {
public:
    static void initialize();
    static void shutdown();

    static void reportMessage(std::string_view subsystem, std::string_view message);
    static void reportWarning(std::string_view subsystem, std::string_view message);
    static void reportError(std::string_view subsystem, std::string_view message);

    static std::vector<DiagnosticEvent> getEvents();
    static void clearEvents();

private:
    static void report(DiagnosticEventType type, std::string_view subsystem, std::string_view message);
};

} // namespace Diagnostics
} // namespace DungeonEngine
