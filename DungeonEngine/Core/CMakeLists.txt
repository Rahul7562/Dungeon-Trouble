add_library(Core
    src/Application.cpp
    src/Clock.cpp
    src/Config.cpp
    src/Engine.cpp
    src/LayerStack.cpp
    src/UUID.cpp
)

target_include_directories(Core PUBLIC include)
target_link_libraries(Core PUBLIC Diagnostics)
