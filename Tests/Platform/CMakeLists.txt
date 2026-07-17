add_executable(PlatformTests
    PlatformTests.cpp
)

set_target_properties(PlatformTests PROPERTIES COMPILE_FLAGS "-fexceptions")

target_link_libraries(PlatformTests PRIVATE
    Platform
    Catch2
)

add_test(NAME PlatformTests COMMAND PlatformTests)
