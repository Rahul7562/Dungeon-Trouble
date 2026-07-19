add_library(DungeonEngine_Gameplay
    src/Stats/StatCalculator.cpp
    src/Items/ItemDefTable.cpp
    src/Items/Inventory.cpp
    src/Items/EquipmentOps.cpp
)

target_include_directories(DungeonEngine_Gameplay PUBLIC include)

target_link_libraries(DungeonEngine_Gameplay PUBLIC
    Core
    DungeonEngine_ECS
    DungeonEngine_Events
)
