cmake_minimum_required(VERSION 3.16)

add_executable(WindowTests src/WindowTests.cpp)

target_include_directories(WindowTests PRIVATE ../../DungeonEngine/Window/include ../../DungeonEngine/Core/include)
target_link_libraries(WindowTests PRIVATE Window Core Catch2)

# Re-enable exceptions for Catch2
set_target_properties(WindowTests PROPERTIES COMPILE_FLAGS "-fexceptions")
