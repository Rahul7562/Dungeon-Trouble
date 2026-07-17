add_library(Input STATIC
    src/InputManager.cpp
    src/InputMapper.cpp
    src/SimulatedDevices.cpp
)

target_include_directories(Input PUBLIC include)
target_include_directories(Input PRIVATE src)

target_link_libraries(Input PUBLIC Core)
