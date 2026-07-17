add_executable(CoreTests
    main.cpp
    Test_Timers.cpp
    Test_UUID.cpp
    Test_Config.cpp
    Test_Engine.cpp
    Test_Result.cpp
)

target_link_libraries(CoreTests PRIVATE Core Catch2)
# Re-enable exceptions just for the test executable so Catch2 works properly
set_target_properties(CoreTests PROPERTIES COMPILE_FLAGS "-fexceptions")
