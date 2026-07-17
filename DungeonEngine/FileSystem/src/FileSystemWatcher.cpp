#include "FileSystem/FileSystemWatcher.h"

namespace DungeonEngine::FileSystem {

    std::unique_ptr<FileSystemWatcher> FileSystemWatcher::Create(const Path& directoryToWatch, bool recursive, FileWatchCallback callback) {
        // Platform specific implementations will go here in the future
        // For now, return nullptr or a dummy implementation to avoid linker errors
        return nullptr;
    }

}
