add_library(Diagnostics
    src/Log.cpp
    src/LogSink.cpp
    src/Assertion.cpp
    src/DiagnosticsManager.cpp
    src/Profiler.cpp
    src/PerformanceCounters.cpp
)

target_include_directories(Diagnostics PUBLIC include)
target_link_libraries(Diagnostics PUBLIC Core Memory)
