add_library(DungeonEngine_Events
    src/EventType.cpp
    src/EventDispatcher.cpp
    src/EventQueue.cpp
)

target_include_directories(DungeonEngine_Events PUBLIC include)

target_link_libraries(DungeonEngine_Events PUBLIC Core)
