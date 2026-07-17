#pragma once

#include "Log.h"
#include <string_view>

namespace DungeonEngine {
namespace Diagnostics {

class LogSink {
public:
    virtual ~LogSink() = default;
    virtual void write(LogLevel level, std::string_view category, std::string_view message) = 0;
};

class ConsoleSink : public LogSink {
public:
    void write(LogLevel level, std::string_view category, std::string_view message) override;
};

class FileSink : public LogSink {
public:
    explicit FileSink(const char* filename);
    ~FileSink() override;
    void write(LogLevel level, std::string_view category, std::string_view message) override;

private:
    void* m_fileHandle; // Avoiding <cstdio> in header
};

} // namespace Diagnostics
} // namespace DungeonEngine
