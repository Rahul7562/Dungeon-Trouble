#include "FileSystem/Directory.h"
#include <filesystem>
#include <system_error>

namespace DungeonEngine::FileSystem {

    Core::Result<bool> Directory::Exists(const Path& path) {
        std::error_code ec;
        bool exists = std::filesystem::is_directory(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ec.message().c_str());
        }
        return exists;
    }

    Core::Result<bool> Directory::Create(const Path& path) {
        std::error_code ec;
        bool created = std::filesystem::create_directory(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ec.message().c_str());
        }
        return created;
    }

    Core::Result<bool> Directory::CreateDirectories(const Path& path) {
        std::error_code ec;
        bool created = std::filesystem::create_directories(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ec.message().c_str());
        }
        return created;
    }

    Core::Result<bool> Directory::Delete(const Path& path, bool recursive) {
        std::error_code ec;
        if (recursive) {
            auto count = std::filesystem::remove_all(path.GetStdPath(), ec);
            if (ec) {
                return Core::Result<bool>::Error(ec.message().c_str());
            }
            return count > 0;
        } else {
            bool result = std::filesystem::remove(path.GetStdPath(), ec);
            if (ec) {
                return Core::Result<bool>::Error(ec.message().c_str());
            }
            return result;
        }
    }

    Core::Result<std::vector<Path>> Directory::GetFiles(const Path& path, bool recursive) {
        std::vector<Path> files;
        std::error_code ec;

        if (!std::filesystem::exists(path.GetStdPath(), ec) || ec) {
             return Core::Result<std::vector<Path>>::Error(ec ? ec.message().c_str() : "Path does not exist");
        }

        if (recursive) {
            for (const auto& entry : std::filesystem::recursive_directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                if (entry.is_regular_file(ec)) {
                    files.push_back(Path(entry.path()));
                }
            }
        } else {
            for (const auto& entry : std::filesystem::directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                if (entry.is_regular_file(ec)) {
                    files.push_back(Path(entry.path()));
                }
            }
        }

        return files;
    }

    Core::Result<std::vector<Path>> Directory::GetDirectories(const Path& path, bool recursive) {
        std::vector<Path> directories;
        std::error_code ec;

        if (!std::filesystem::exists(path.GetStdPath(), ec) || ec) {
            return Core::Result<std::vector<Path>>::Error(ec ? ec.message().c_str() : "Path does not exist");
        }

        if (recursive) {
            for (const auto& entry : std::filesystem::recursive_directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                if (entry.is_directory(ec)) {
                    directories.push_back(Path(entry.path()));
                }
            }
        } else {
            for (const auto& entry : std::filesystem::directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                if (entry.is_directory(ec)) {
                    directories.push_back(Path(entry.path()));
                }
            }
        }

        return directories;
    }

    Core::Result<std::vector<Path>> Directory::GetEntries(const Path& path, bool recursive) {
        std::vector<Path> entries;
        std::error_code ec;

        if (!std::filesystem::exists(path.GetStdPath(), ec) || ec) {
            return Core::Result<std::vector<Path>>::Error(ec ? ec.message().c_str() : "Path does not exist");
        }

        if (recursive) {
            for (const auto& entry : std::filesystem::recursive_directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                entries.push_back(Path(entry.path()));
            }
        } else {
            for (const auto& entry : std::filesystem::directory_iterator(path.GetStdPath(), ec)) {
                if (ec) {
                    return Core::Result<std::vector<Path>>::Error(ec.message().c_str());
                }
                entries.push_back(Path(entry.path()));
            }
        }

        return entries;
    }

    Path Directory::GetCurrentWorkingDirectory() {
        std::error_code ec;
        auto p = std::filesystem::current_path(ec);
        if (ec) {
            // Fallback or handle error (cannot return Result here easily without changing API)
            return Path("");
        }
        return Path(p);
    }

    Core::Result<bool> Directory::SetCurrentWorkingDirectory(const Path& path) {
        std::error_code ec;
        std::filesystem::current_path(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ec.message().c_str());
        }
        return true;
    }

}
