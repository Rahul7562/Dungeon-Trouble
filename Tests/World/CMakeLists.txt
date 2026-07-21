cmake_minimum_required(VERSION 3.16)

file(GLOB_RECURSE SRC_FILES *.cpp)

add_executable(WorldTests ${SRC_FILES})

target_include_directories(WorldTests PRIVATE
    ${CMAKE_SOURCE_DIR}/DungeonEngine/World/include
    ${CMAKE_SOURCE_DIR}/DungeonEngine/Core/include
    ${CMAKE_SOURCE_DIR}/DungeonEngine/Math/include
    ${CMAKE_SOURCE_DIR}/ThirdParty/catch2/include
)

target_link_libraries(WorldTests PRIVATE
    DungeonEngine_World
    Core
    Catch2
)

# Catch2 configuration in this project requires -fexceptions for test executables
# WAIT - memory instructions say "Catch2 tests must be built strictly without exceptions to match the engine's -fno-exceptions compilation flag. Do not re-enable exceptions (e.g., -fexceptions) for Catch2 test executables in CMakeLists.txt."
# So I should NOT add set_target_properties(WorldTests PROPERTIES COMPILE_FLAGS "-fexceptions")
