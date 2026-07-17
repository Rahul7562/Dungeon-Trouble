#pragma once

#include "FileSystem/Path.h"
#include "Core/Result.h"
#include <vector>

namespace DungeonEngine::FileSystem {

    class Directory {
    public:
        static Core::Result<bool> Exists(const Path& path);
        static Core::Result<bool> Create(const Path& path);
        static Core::Result<bool> CreateDirectories(const Path& path);
        static Core::Result<bool> Delete(const Path& path, bool recursive = false);

        static Core::Result<std::vector<Path>> GetFiles(const Path& path, bool recursive = false);
        static Core::Result<std::vector<Path>> GetDirectories(const Path& path, bool recursive = false);
        static Core::Result<std::vector<Path>> GetEntries(const Path& path, bool recursive = false);

        static Path GetCurrentWorkingDirectory();
        static Core::Result<bool> SetCurrentWorkingDirectory(const Path& path);
    };

}
