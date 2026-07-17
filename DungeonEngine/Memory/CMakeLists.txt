add_library(Memory
    src/MemoryUtils.cpp
    src/LinearAllocator.cpp
    src/StackAllocator.cpp
    src/PoolAllocator.cpp
    src/FreeListAllocator.cpp
    src/ArenaAllocator.cpp
    src/MemoryManager.cpp
)

target_include_directories(Memory PUBLIC include)
target_link_libraries(Memory PUBLIC Core)
