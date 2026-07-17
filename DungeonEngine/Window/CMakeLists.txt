cmake_minimum_required(VERSION 3.16)

# Create the Window target
add_library(Window
    src/WindowManager.cpp
    src/WindowImpl_Windows.cpp
    src/WindowImpl_Linux.cpp
    src/WindowImpl_macOS.cpp
)

# Add include directories
target_include_directories(Window PUBLIC include)

# Link against Core
target_link_libraries(Window PUBLIC Core)

# Ensure C++17
set_target_properties(Window PROPERTIES CXX_STANDARD 17)
