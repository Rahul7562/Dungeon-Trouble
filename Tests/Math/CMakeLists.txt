cmake_minimum_required(VERSION 3.16)

file(GLOB_RECURSE SRC_FILES *.cpp)

# Define test executable
add_executable(MathTests ${SRC_FILES})

# Link dependencies
target_link_libraries(MathTests PRIVATE DungeonEngine_Math Catch2)

# Re-enable exceptions just for the test executable so Catch2 works properly
set_target_properties(MathTests PROPERTIES COMPILE_FLAGS "-fexceptions")
