add_executable(InputTests
    InputTests.cpp
)

target_include_directories(InputTests PRIVATE ${CMAKE_SOURCE_DIR}/ThirdParty/catch2)
target_link_libraries(InputTests PRIVATE Input Core Catch2)

# We must explicitly enable exceptions for Catch2 test executables in this project
set_target_properties(InputTests PROPERTIES COMPILE_FLAGS "-fexceptions")
