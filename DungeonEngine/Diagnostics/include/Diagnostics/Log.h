#pragma once

#include <cstdint>
#include <string_view>

namespace DungeonEngine {
namespace Diagnostics {

enum class LogLevel : uint8_t {
    Trace,
    Debug,
    Info,
    Warning,
    Error,
    Critical,
    Fatal
};

class Logger {
public:
    static void initialize();
    static void shutdown();
    static void setGlobalLevel(LogLevel level);

    static void log(LogLevel level, std::string_view category, const char* format, ...);

    // Macro support for ease of use
    static void trace(std::string_view category, const char* format, ...);
    static void debug(std::string_view category, const char* format, ...);
    static void info(std::string_view category, const char* format, ...);
    static void warn(std::string_view category, const char* format, ...);
    static void error(std::string_view category, const char* format, ...);
    static void critical(std::string_view category, const char* format, ...);
    static void fatal(std::string_view category, const char* format, ...);
};

// Convenience macros for logging
#define DT_LOG_TRACE(category, ...) DungeonEngine::Diagnostics::Logger::trace(category, __VA_ARGS__)
#define DT_LOG_DEBUG(category, ...) DungeonEngine::Diagnostics::Logger::debug(category, __VA_ARGS__)
#define DT_LOG_INFO(category, ...) DungeonEngine::Diagnostics::Logger::info(category, __VA_ARGS__)
#define DT_LOG_WARN(category, ...) DungeonEngine::Diagnostics::Logger::warn(category, __VA_ARGS__)
#define DT_LOG_ERROR(category, ...) DungeonEngine::Diagnostics::Logger::error(category, __VA_ARGS__)
#define DT_LOG_CRITICAL(category, ...) DungeonEngine::Diagnostics::Logger::critical(category, __VA_ARGS__)
#define DT_LOG_FATAL(category, ...) DungeonEngine::Diagnostics::Logger::fatal(category, __VA_ARGS__)

} // namespace Diagnostics
} // namespace DungeonEngine
