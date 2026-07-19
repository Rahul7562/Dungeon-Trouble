add_executable(SimulationTests
    SimulationTests.cpp
)

target_include_directories(SimulationTests PRIVATE ../../ThirdParty/catch2)

target_link_libraries(SimulationTests PRIVATE
    DungeonEngine_Simulation
    Catch2
    Core
)

set_target_properties(SimulationTests PROPERTIES COMPILE_FLAGS "-fexceptions")
