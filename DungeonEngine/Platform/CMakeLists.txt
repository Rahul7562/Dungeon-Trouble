add_library(Platform
    src/PlatformManager.cpp
)

if(WIN32)
    target_sources(Platform PRIVATE
        src/Windows/PlatformWindows.cpp
    )
else()
    target_sources(Platform PRIVATE
        src/Posix/PlatformPosix.cpp
    )
endif()

target_include_directories(Platform
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        src
)

target_link_libraries(Platform PUBLIC Core)

if(NOT WIN32 AND NOT APPLE)
    target_link_libraries(Platform PRIVATE dl)
endif()
