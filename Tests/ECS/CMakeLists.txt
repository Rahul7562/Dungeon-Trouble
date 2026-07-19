add_executable(ECSTests
    ECSTests.cpp
)

target_include_directories(ECSTests PRIVATE ../../ThirdParty/catch2)

target_link_libraries(ECSTests PRIVATE
    DungeonEngine_ECS
    Catch2
    Core
)

# Do not re-enable exceptions for tests in ECS, Catch2 is built without them here
