# ADR-002: Filesystem & Virtual File System (VFS)

## Status
Accepted

## Context
DungeonTrouble requires a robust filesystem abstraction to isolate platform-specific APIs and provide a unified interface for future engine systems (such as resource management, asset pipelines, and hot reloading).

## Decision
We have designed and implemented a custom `FileSystem` module with the following components:
- **Path Abstraction:** A `Path` class wrapping `std::filesystem::path` to provide platform-independent path operations, normalization, and extension helpers.
- **Platform Filesystem Abstractions:** `File` and `Directory` classes utilizing `std::filesystem` with `std::error_code` to adhere to the engine's `-fno-exceptions` policy.
- **Stream System:** Core streaming interfaces (`IStream`, `FileStream`, `MemoryStream`) and utility reader/writer wrappers (`BinaryReader`, `BinaryWriter`, `TextReader`, `TextWriter`).
- **Virtual File System (VFS):** A mountable VFS architecture allowing physical directories (and future archive formats like ZIP) to be mounted to virtual paths. This prevents hardcoding absolute paths and supports package abstractions.
- **Utilities:** Foundational file system watching (`FileSystemWatcher` interface) and basic serialization helpers.

## Trade-Offs
- **Exceptions Disabled:** Since standard C++ exceptions are disabled, we leverage `std::error_code` from `std::filesystem` alongside the custom `Core::Result` type. This increases verbosity but guarantees control flow safety.
- **Dependency on `std::filesystem`:** We rely on the standard library instead of OS-specific APIs for filesystem access. This greatly simplifies cross-platform compatibility but may lack some specific OS features which can be bridged later if required.

## Consequences
- Engine subsystems must now exclusively use the `VirtualFileSystem` or `File`/`Directory` abstractions for I/O operations, ensuring long-term flexibility.
