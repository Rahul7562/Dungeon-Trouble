add_executable(MemoryTests
    MemoryTests.cpp
)

target_link_libraries(MemoryTests PRIVATE Memory Catch2)
# Re-enable exceptions just for the test executable so Catch2 works properly
set_target_properties(MemoryTests PROPERTIES COMPILE_FLAGS "-fexceptions")

add_test(NAME MemoryTests COMMAND MemoryTests)
