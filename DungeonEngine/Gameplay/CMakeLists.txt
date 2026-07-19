add_library(DungeonEngine_Gameplay
    src/Stats/StatCalculator.cpp
    src/Combat/DamagePipeline.cpp
    src/Combat/CombatSystem.cpp
    src/Combat/HitQuery.cpp
)

target_include_directories(DungeonEngine_Gameplay PUBLIC include)

target_link_libraries(DungeonEngine_Gameplay PUBLIC
    Core
    DungeonEngine_ECS
    DungeonEngine_Math
    DungeonEngine_Events
    DungeonEngine_Simulation
)
