set(FILESYSTEM_TESTS_SRC
    src/main.cpp
    src/Test_Path.cpp
    src/Test_File.cpp
    src/Test_Directory.cpp
    src/Test_Stream.cpp
    src/Test_VFS.cpp
)

add_executable(FileSystemTests ${FILESYSTEM_TESTS_SRC})
target_include_directories(FileSystemTests PRIVATE ../../ThirdParty/catch2)
target_link_libraries(FileSystemTests PRIVATE FileSystem Catch2 Core)

# Re-enable exceptions just for the test executable so Catch2 works properly
set_target_properties(FileSystemTests PROPERTIES COMPILE_FLAGS "-fexceptions")
