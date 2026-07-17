#include "Diagnostics/Log.h"
#include "Diagnostics/LogSink.h"
#include <vector>
#include <memory>
#include <cstdarg>
#include <cstdio>
#include <mutex>

namespace DungeonEngine {
namespace Diagnostics {

struct LoggerData {
    std::vector<std::unique_ptr<LogSink>> sinks;
    LogLevel globalLevel = LogLevel::Info;
    std::mutex logMutex;
};

static LoggerData* s_loggerData = nullptr;

void Logger::initialize() {
    if (!s_loggerData) {
        s_loggerData = new LoggerData();
        s_loggerData->sinks.push_back(std::make_unique<ConsoleSink>());
    }
}

void Logger::shutdown() {
    if (s_loggerData) {
        delete s_loggerData;
        s_loggerData = nullptr;
    }
}

void Logger::setGlobalLevel(LogLevel level) {
    if (s_loggerData) {
        s_loggerData->globalLevel = level;
    }
}

void Logger::log(LogLevel level, std::string_view category, const char* format, ...) {
    if (!s_loggerData || level < s_loggerData->globalLevel) {
        return;
    }

    char buffer[4096];
    va_list args;
    va_start(args, format);
    int length = std::vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);

    if (length > 0) {
        std::string_view message(buffer, static_cast<size_t>(length));

        std::lock_guard<std::mutex> lock(s_loggerData->logMutex);
        for (auto& sink : s_loggerData->sinks) {
            sink->write(level, category, message);
        }
    }
}

static void logInternal(LogLevel level, std::string_view category, const char* format, va_list args) {
    if (!s_loggerData || level < s_loggerData->globalLevel) {
        return;
    }

    char buffer[4096];
    int length = std::vsnprintf(buffer, sizeof(buffer), format, args);

    if (length > 0) {
        std::string_view message(buffer, static_cast<size_t>(length));

        std::lock_guard<std::mutex> lock(s_loggerData->logMutex);
        for (auto& sink : s_loggerData->sinks) {
            sink->write(level, category, message);
        }
    }
}

void Logger::trace(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Trace, category, format, args); va_end(args);
}
void Logger::debug(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Debug, category, format, args); va_end(args);
}
void Logger::info(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Info, category, format, args); va_end(args);
}
void Logger::warn(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Warning, category, format, args); va_end(args);
}
void Logger::error(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Error, category, format, args); va_end(args);
}
void Logger::critical(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Critical, category, format, args); va_end(args);
}
void Logger::fatal(std::string_view category, const char* format, ...) {
    va_list args; va_start(args, format); logInternal(LogLevel::Fatal, category, format, args); va_end(args);
}

} // namespace Diagnostics
} // namespace DungeonEngine
