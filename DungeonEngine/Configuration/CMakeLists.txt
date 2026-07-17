project(Configuration CXX)

file(GLOB_RECURSE SOURCES "src/*.cpp")
file(GLOB_RECURSE HEADERS "include/Configuration/*.h")

add_library(Configuration STATIC ${SOURCES} ${HEADERS})

target_include_directories(Configuration PUBLIC include)
target_link_libraries(Configuration PUBLIC Core)
