add_library(DungeonEngine_Simulation
    src/SimulationClock.cpp
    src/SystemScheduler.cpp
    src/SimulationLoop.cpp
    src/SimRandom.cpp
)

target_include_directories(DungeonEngine_Simulation PUBLIC include)

target_link_libraries(DungeonEngine_Simulation PUBLIC
    Core
)
