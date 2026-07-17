cmake_minimum_required(VERSION 3.16)

file(GLOB_RECURSE SRC_FILES src/*.cpp)
file(GLOB_RECURSE INC_FILES include/Math/*.h)

add_library(DungeonEngine_Math STATIC ${SRC_FILES} ${INC_FILES})

target_include_directories(DungeonEngine_Math PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

target_link_libraries(DungeonEngine_Math PUBLIC Core)
