add_library(DungeonEngine_Gameplay
    src/Stats/StatCalculator.cpp
    src/Combat/DamagePipeline.cpp
    src/Combat/CombatSystem.cpp
    src/Combat/HitQuery.cpp
    src/Items/ItemDefTable.cpp
    src/Items/Inventory.cpp
    src/Items/EquipmentOps.cpp
    src/Abilities/AbilityDefTable.cpp
    src/Abilities/StatusEffectDefTable.cpp
    src/Abilities/AbilitySystem.cpp
    src/Abilities/StatusEffectSystem.cpp
)

target_include_directories(DungeonEngine_Gameplay PUBLIC include)

target_link_libraries(DungeonEngine_Gameplay PUBLIC
    Core
    DungeonEngine_ECS
    DungeonEngine_Math
    DungeonEngine_Events
    DungeonEngine_Simulation
)
