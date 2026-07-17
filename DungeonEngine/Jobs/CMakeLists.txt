add_library(DungeonEngine_Jobs
    src/JobScheduler.cpp
    src/WorkerThread.cpp
    src/CancellationToken.cpp
)

target_include_directories(DungeonEngine_Jobs PUBLIC include)

target_link_libraries(DungeonEngine_Jobs PUBLIC
    Core
    DungeonEngine_Threading
    Diagnostics
    Memory
)
