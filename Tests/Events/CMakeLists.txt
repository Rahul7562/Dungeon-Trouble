add_executable(EventsTests
    EventsTests.cpp
)

target_include_directories(EventsTests PRIVATE ../../ThirdParty/catch2)

target_link_libraries(EventsTests PRIVATE
    DungeonEngine_Events
    Catch2
    Core
)



add_test(NAME EventsTests COMMAND EventsTests)
