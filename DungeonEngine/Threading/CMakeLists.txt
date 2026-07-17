add_library(DungeonEngine_Threading
    src/Thread.cpp
    src/ThreadManager.cpp
)

target_include_directories(DungeonEngine_Threading PUBLIC include)
target_link_libraries(DungeonEngine_Threading PUBLIC Core Diagnostics Threads::Threads)

find_package(Threads REQUIRED)
