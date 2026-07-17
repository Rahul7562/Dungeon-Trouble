add_executable(JobsTests
    JobSystemTests.cpp
)

target_include_directories(JobsTests PRIVATE ../../ThirdParty/catch2)

target_link_libraries(JobsTests PRIVATE
    DungeonEngine_Jobs
    Catch2
    Core
)

set_target_properties(JobsTests PROPERTIES COMPILE_FLAGS "-fexceptions")
