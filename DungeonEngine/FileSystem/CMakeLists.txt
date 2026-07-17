set(FILESYSTEM_SRC
    src/Path.cpp
    src/File.cpp
    src/Directory.cpp
    src/FileStream.cpp
    src/VFS.cpp
)

add_library(FileSystem STATIC ${FILESYSTEM_SRC})
target_include_directories(FileSystem PUBLIC include)
target_link_libraries(FileSystem PUBLIC Core DungeonEngine_Math Memory)
