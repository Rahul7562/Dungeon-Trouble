#include "FileSystem/Path.h"

namespace DungeonEngine::FileSystem {

    Path::Path(const Core::String& pathStr) : m_Path(pathStr) {}
    Path::Path(const char* pathStr) : m_Path(pathStr) {}
    Path::Path(const std::filesystem::path& path) : m_Path(path) {}

    bool Path::IsAbsolute() const { return m_Path.is_absolute(); }
    bool Path::IsRelative() const { return m_Path.is_relative(); }
    bool Path::HasExtension() const { return m_Path.has_extension(); }
    bool Path::HasFilename() const { return m_Path.has_filename(); }
    bool Path::HasParentPath() const { return m_Path.has_parent_path(); }
    bool Path::IsEmpty() const { return m_Path.empty(); }

    Path Path::GetExtension() const { return Path(m_Path.extension()); }
    Path Path::GetFilename() const { return Path(m_Path.filename()); }
    Path Path::GetStem() const { return Path(m_Path.stem()); }
    Path Path::GetParentPath() const { return Path(m_Path.parent_path()); }

    Path Path::LexicallyNormal() const { return Path(m_Path.lexically_normal()); }
    Path Path::LexicallyRelative(const Path& base) const { return Path(m_Path.lexically_relative(base.m_Path)); }

    Path& Path::Append(const Path& other) { m_Path /= other.m_Path; return *this; }
    Path& Path::Concat(const Path& other) { m_Path += other.m_Path; return *this; }

    Path& Path::ReplaceExtension(const Path& ext) { m_Path.replace_extension(ext.m_Path); return *this; }

    Path& Path::MakePreferred() { m_Path.make_preferred(); return *this; }

    void Path::Clear() { m_Path.clear(); }

    Core::String Path::ToString() const {
        // We ensure we get standard string format on all platforms
        auto str = m_Path.generic_string();
        return Core::String(str.begin(), str.end());
    }

    bool Path::operator==(const Path& other) const { return m_Path == other.m_Path; }
    bool Path::operator!=(const Path& other) const { return m_Path != other.m_Path; }
    Path Path::operator/(const Path& other) const { return Path(m_Path / other.m_Path); }

}
