#include "Diagnostics/LogSink.h"
#include <cstdio>
#include <ctime>
#include <string>

namespace DungeonEngine {
namespace Diagnostics {

static const char* logLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::Trace: return "TRACE";
        case LogLevel::Debug: return "DEBUG";
        case LogLevel::Info:  return "INFO ";
        case LogLevel::Warning: return "WARN ";
        case LogLevel::Error: return "ERROR";
        case LogLevel::Critical: return "CRIT ";
        case LogLevel::Fatal: return "FATAL";
        default: return "UNKWN";
    }
}

static const char* logLevelToColor(LogLevel level) {
    switch (level) {
        case LogLevel::Trace: return "\x1b[90m"; // Dark Gray
        case LogLevel::Debug: return "\x1b[36m"; // Cyan
        case LogLevel::Info:  return "\x1b[32m"; // Green
        case LogLevel::Warning: return "\x1b[33m"; // Yellow
        case LogLevel::Error: return "\x1b[31m"; // Red
        case LogLevel::Critical: return "\x1b[35m"; // Magenta
        case LogLevel::Fatal: return "\x1b[41;37m"; // White on Red
        default: return "\x1b[0m"; // Reset
    }
}

void ConsoleSink::write(LogLevel level, std::string_view category, std::string_view message) {
    std::time_t now = std::time(nullptr);
    std::tm* timeinfo = std::localtime(&now);
    char timebuf[20];
    std::strftime(timebuf, sizeof(timebuf), "%Y-%m-%d %H:%M:%S", timeinfo);

    FILE* stream = (level >= LogLevel::Error) ? stderr : stdout;

    const char* color = logLevelToColor(level);
    const char* reset = "\x1b[0m";

    std::fprintf(stream, "%s[%s] %s[%s]%s [%.*s] %.*s\n",
        color, timebuf, color, logLevelToString(level), reset,
        static_cast<int>(category.length()), category.data(),
        static_cast<int>(message.length()), message.data());
}

FileSink::FileSink(const char* filename) {
    m_fileHandle = std::fopen(filename, "w");
}

FileSink::~FileSink() {
    if (m_fileHandle) {
        std::fclose(static_cast<FILE*>(m_fileHandle));
    }
}

void FileSink::write(LogLevel level, std::string_view category, std::string_view message) {
    if (!m_fileHandle) return;

    FILE* file = static_cast<FILE*>(m_fileHandle);

    std::time_t now = std::time(nullptr);
    std::tm* timeinfo = std::localtime(&now);
    char timebuf[20];
    std::strftime(timebuf, sizeof(timebuf), "%Y-%m-%d %H:%M:%S", timeinfo);

    std::fprintf(file, "[%s] [%s] [%.*s] %.*s\n",
        timebuf, logLevelToString(level),
        static_cast<int>(category.length()), category.data(),
        static_cast<int>(message.length()), message.data());
    std::fflush(file);
}

} // namespace Diagnostics
} // namespace DungeonEngine
