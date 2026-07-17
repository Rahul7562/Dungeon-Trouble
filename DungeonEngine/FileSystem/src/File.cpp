#include "FileSystem/File.h"
#include "Core/Assert.h"
#include <fstream>
#include <sstream>

namespace DungeonEngine::FileSystem {

    Core::String File::ErrorCodeToString(const std::error_code& ec) {
        return Core::String(ec.message().c_str());
    }

    Core::Result<bool> File::Exists(const Path& path) {
        std::error_code ec;
        bool exists = std::filesystem::exists(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ErrorCodeToString(ec));
        }
        return exists;
    }

    Core::Result<bool> File::Delete(const Path& path) {
        std::error_code ec;
        bool result = std::filesystem::remove(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ErrorCodeToString(ec));
        }
        return result;
    }

    Core::Result<bool> File::Copy(const Path& from, const Path& to, bool overwrite) {
        std::error_code ec;
        std::filesystem::copy_options opts = std::filesystem::copy_options::none;
        if (overwrite) {
            opts |= std::filesystem::copy_options::overwrite_existing;
        }
        bool result = std::filesystem::copy_file(from.GetStdPath(), to.GetStdPath(), opts, ec);
        if (ec) {
            return Core::Result<bool>::Error(ErrorCodeToString(ec));
        }
        return result;
    }

    Core::Result<bool> File::Move(const Path& from, const Path& to) {
        std::error_code ec;
        std::filesystem::rename(from.GetStdPath(), to.GetStdPath(), ec);
        if (ec) {
            return Core::Result<bool>::Error(ErrorCodeToString(ec));
        }
        return true;
    }

    Core::Result<bool> File::Rename(const Path& from, const Path& to) {
        return Move(from, to);
    }

    Core::Result<FileMetadata> File::GetMetadata(const Path& path) {
        std::error_code ec;
        std::filesystem::file_status status = std::filesystem::status(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<FileMetadata>::Error(ErrorCodeToString(ec));
        }

        FileMetadata metadata;
        metadata.Size = std::filesystem::file_size(path.GetStdPath(), ec);
        if (ec) {
            // It could be a directory which doesn't have a file_size on some OS
            metadata.Size = 0;
            ec.clear();
        }

        metadata.LastWriteTime = std::filesystem::last_write_time(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<FileMetadata>::Error(ErrorCodeToString(ec));
        }

        metadata.IsDirectory = std::filesystem::is_directory(status);
        metadata.IsSymlink = std::filesystem::is_symlink(status);
        metadata.Permissions = status.permissions();

        return metadata;
    }

    Core::Result<Core::u64> File::GetSize(const Path& path) {
        std::error_code ec;
        auto size = std::filesystem::file_size(path.GetStdPath(), ec);
        if (ec) {
            return Core::Result<Core::u64>::Error(ErrorCodeToString(ec));
        }
        return size;
    }

    Core::Result<bool> File::ReadAllBytes(const Path& path, Core::u8** outData, Core::u64& outSize) {
        DT_ASSERT(outData != nullptr, "Output data pointer is null");

        std::ifstream file(path.GetStdPath(), std::ios::binary | std::ios::ate);
        if (!file.is_open()) {
            return Core::Result<bool>::Error("Failed to open file for reading: " + path.ToString());
        }

        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);

        if (size <= 0) {
            *outData = nullptr;
            outSize = 0;
            return true; // Empty file is a success but no data
        }

        // Ideally we would use our custom allocator here, but for this abstraction malloc is fine
        // as long as the caller is responsible for freeing. In a full engine this would take an allocator.
        *outData = new Core::u8[size];
        outSize = size;

        if (file.read(reinterpret_cast<char*>(*outData), size)) {
            return true;
        }

        delete[] *outData;
        *outData = nullptr;
        outSize = 0;
        return Core::Result<bool>::Error("Failed to read data from file: " + path.ToString());
    }

    Core::Result<Core::String> File::ReadAllText(const Path& path) {
        std::ifstream file(path.GetStdPath());
        if (!file.is_open()) {
            return Core::Result<Core::String>::Error("Failed to open file for reading: " + path.ToString());
        }

        std::stringstream buffer;
        buffer << file.rdbuf();
        return buffer.str();
    }

    Core::Result<bool> File::WriteAllBytes(const Path& path, const Core::u8* data, Core::u64 size) {
        std::ofstream file(path.GetStdPath(), std::ios::binary);
        if (!file.is_open()) {
            return Core::Result<bool>::Error("Failed to open file for writing: " + path.ToString());
        }

        if (size > 0 && data != nullptr) {
            file.write(reinterpret_cast<const char*>(data), size);
            if (file.fail()) {
                return Core::Result<bool>::Error("Failed to write data to file: " + path.ToString());
            }
        }
        return true;
    }

    Core::Result<bool> File::WriteAllText(const Path& path, const Core::String& text) {
        std::ofstream file(path.GetStdPath());
        if (!file.is_open()) {
            return Core::Result<bool>::Error("Failed to open file for writing: " + path.ToString());
        }

        file << text;
        if (file.fail()) {
            return Core::Result<bool>::Error("Failed to write text to file: " + path.ToString());
        }
        return true;
    }

}
