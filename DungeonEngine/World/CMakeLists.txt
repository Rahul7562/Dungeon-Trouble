add_library(DungeonEngine_World
    src/TileMap.cpp
    src/ZoneLoader.cpp
    src/ZoneRegistry.cpp
)

target_include_directories(DungeonEngine_World PUBLIC include)

target_link_libraries(DungeonEngine_World PUBLIC
    Core
)
