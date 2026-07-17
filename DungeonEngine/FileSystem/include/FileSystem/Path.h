#pragma once

#include "Core/Types.h"
#include <filesystem>
#include <string_view>

namespace DungeonEngine::FileSystem {

    class Path {
    public:
        Path() = default;
        Path(const Core::String& pathStr);
        Path(const char* pathStr);
        Path(const std::filesystem::path& path);

        Path(const Path& other) = default;
        Path& operator=(const Path& other) = default;
        Path(Path&& other) noexcept = default;
        Path& operator=(Path&& other) noexcept = default;

        bool IsAbsolute() const;
        bool IsRelative() const;
        bool HasExtension() const;
        bool HasFilename() const;
        bool HasParentPath() const;
        bool IsEmpty() const;

        Path GetExtension() const;
        Path GetFilename() const;
        Path GetStem() const;
        Path GetParentPath() const;

        Path LexicallyNormal() const;
        Path LexicallyRelative(const Path& base) const;

        Path& Append(const Path& other);
        Path& Concat(const Path& other);

        Path& ReplaceExtension(const Path& ext);

        Path& MakePreferred();

        void Clear();

        Core::String ToString() const;
        const std::filesystem::path& GetStdPath() const { return m_Path; }

        bool operator==(const Path& other) const;
        bool operator!=(const Path& other) const;
        Path operator/(const Path& other) const;

        // Platform independent separators
        static constexpr char Separator = '/';

    private:
        std::filesystem::path m_Path;
    };

}
