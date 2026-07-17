#pragma once

#include "FileSystem/Path.h"
#include <functional>
#include <memory>

namespace DungeonEngine::FileSystem {

    enum class FileAction {
        Added,
        Removed,
        Modified,
        RenamedOld,
        RenamedNew
    };

    using FileWatchCallback = std::function<void(const Path& path, FileAction action)>;

    class FileSystemWatcher {
    public:
        virtual ~FileSystemWatcher() = default;

        virtual void Start() = 0;
        virtual void Stop() = 0;

        static std::unique_ptr<FileSystemWatcher> Create(const Path& directoryToWatch, bool recursive, FileWatchCallback callback);
    };

}
