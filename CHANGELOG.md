
## Milestone 4

### Added
- Implemented `MemoryUtils` with alignment and standard memory operation helpers.
- Added `MemoryCategory` enum for detailed allocation tagging (Core, Math, Renderer, Physics, Audio, Resources, Networking, Editor, UI, Gameplay).
- Created `IAllocator` abstract interface to standardize memory allocators.
- Implemented `LinearAllocator` for fast, append-only contiguous allocations.
- Implemented `StackAllocator` for LIFO allocations with marker rollback support.
- Implemented `PoolAllocator` for O(1) allocation and freeing of fixed-size blocks.
- Implemented `FreeListAllocator` for general-purpose variable-size allocations with block coalescing.
- Implemented `ArenaAllocator` to manage large chunks of OS memory.
- Implemented `MemoryManager` as a central singleton to track allocations, detect leaks, and route allocations.
- Added comprehensive Catch2 unit tests for all allocators and the memory manager.

### Changed
- Updated CMake configuration to include `DungeonEngine/Memory` and `Tests/Memory`.
- Integrated `DT_ASSERT` into the memory subsystem for robust error checking.

### Fixed
- N/A

### Known Limitations
- The `MemoryManager` currently expects manual tracking updates when custom allocators are used outside of `allocateFrom()`.
- Global new/delete operators are not yet overridden; reliance remains on explicit allocator use.
