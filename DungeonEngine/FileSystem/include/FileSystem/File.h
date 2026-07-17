#pragma once

#include "FileSystem/Path.h"
#include "Core/Result.h"
#include "Core/Types.h"
#include <filesystem>
#include <system_error>

namespace DungeonEngine::FileSystem {

    struct FileMetadata {
        Core::u64 Size;
        std::filesystem::file_time_type LastWriteTime;
        bool IsDirectory;
        bool IsSymlink;
        std::filesystem::perms Permissions;
    };

    class File {
    public:
        // Core operations
        static Core::Result<bool> Exists(const Path& path);
        static Core::Result<bool> Delete(const Path& path);
        static Core::Result<bool> Copy(const Path& from, const Path& to, bool overwrite = false);
        static Core::Result<bool> Move(const Path& from, const Path& to);
        static Core::Result<bool> Rename(const Path& from, const Path& to);

        // Metadata
        static Core::Result<FileMetadata> GetMetadata(const Path& path);
        static Core::Result<Core::u64> GetSize(const Path& path);

        // Utilities
        static Core::Result<bool> ReadAllBytes(const Path& path, Core::u8** outData, Core::u64& outSize);
        static Core::Result<Core::String> ReadAllText(const Path& path);
        static Core::Result<bool> WriteAllBytes(const Path& path, const Core::u8* data, Core::u64 size);
        static Core::Result<bool> WriteAllText(const Path& path, const Core::String& text);

    private:
        static Core::String ErrorCodeToString(const std::error_code& ec);
    };

}
