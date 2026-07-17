find_package(Threads REQUIRED)

add_executable(ThreadingTests
    Main.cpp
    AtomicTests.cpp
    SynchronizationTests.cpp
    ThreadTests.cpp
)

target_include_directories(ThreadingTests PRIVATE ${CMAKE_SOURCE_DIR}/ThirdParty/catch2)
target_link_libraries(ThreadingTests PRIVATE DungeonEngine_Threading Catch2 Threads::Threads)
set_target_properties(ThreadingTests PROPERTIES COMPILE_FLAGS "-fexceptions")

# Add test target
add_test(NAME ThreadingTests COMMAND ThreadingTests)
