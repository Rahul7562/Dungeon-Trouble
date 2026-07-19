add_library(DungeonEngine_ECS
    src/EntityRegistry.cpp
    src/Registry.cpp
    src/CommandBuffer.cpp
)

target_include_directories(DungeonEngine_ECS PUBLIC include)

target_link_libraries(DungeonEngine_ECS PUBLIC
    Core
)
