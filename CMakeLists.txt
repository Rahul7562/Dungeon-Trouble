cmake_minimum_required(VERSION 3.16)
project(DungeonTrouble CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions")

add_subdirectory(DungeonEngine/Core)
add_subdirectory(ThirdParty/catch2)
add_subdirectory(Tests/Core)
