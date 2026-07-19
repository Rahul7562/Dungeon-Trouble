add_executable(GameplayTests
    GameplayTests.cpp
    ItemsTests.cpp
)

target_include_directories(GameplayTests PRIVATE ../../ThirdParty/catch2)

target_link_libraries(GameplayTests PRIVATE
    DungeonEngine_Gameplay
    DungeonEngine_ECS
    DungeonEngine_Math
    Catch2
    Core
)
