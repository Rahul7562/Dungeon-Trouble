add_executable(DiagnosticsTests
    main.cpp
    TestLogging.cpp
    TestAssertions.cpp
    TestProfiler.cpp
    TestPerformanceCounters.cpp
)

target_link_libraries(DiagnosticsTests PRIVATE Diagnostics Catch2)
set_target_properties(DiagnosticsTests PROPERTIES COMPILE_FLAGS "-fexceptions")

add_test(NAME DiagnosticsTests COMMAND DiagnosticsTests)
