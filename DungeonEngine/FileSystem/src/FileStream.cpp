#include "FileSystem/FileStream.h"
#include "Core/Assert.h"

namespace DungeonEngine::FileSystem {

    FileStream::FileStream(const Path& path, FileMode mode)
        : m_Path(path), m_Mode(mode) {

        std::ios_base::openmode openMode = std::ios_base::binary;
        switch (mode) {
            case FileMode::Read:
                openMode |= std::ios_base::in;
                break;
            case FileMode::Write:
                openMode |= std::ios_base::out | std::ios_base::trunc;
                break;
            case FileMode::Append:
                openMode |= std::ios_base::out | std::ios_base::app;
                break;
            case FileMode::ReadWrite:
                openMode |= std::ios_base::in | std::ios_base::out;
                break;
            default:
                DT_ASSERT(false, "Unknown FileMode");
                break;
        }

        m_File.open(path.GetStdPath(), openMode);
    }

    FileStream::~FileStream() {
        Close();
    }

    bool FileStream::CanRead() const {
        return m_Mode == FileMode::Read || m_Mode == FileMode::ReadWrite;
    }

    bool FileStream::CanWrite() const {
        return m_Mode == FileMode::Write || m_Mode == FileMode::Append || m_Mode == FileMode::ReadWrite;
    }

    Core::u64 FileStream::GetPosition() const {
        if (!m_File.is_open()) return 0;

        if (CanRead()) {
            return static_cast<Core::u64>(const_cast<std::fstream&>(m_File).tellg());
        } else {
            return static_cast<Core::u64>(const_cast<std::fstream&>(m_File).tellp());
        }
    }

    Core::u64 FileStream::GetLength() const {
        if (!m_File.is_open()) return 0;

        // Save current pos
        auto currentPos = GetPosition();

        // Seek to end
        const_cast<std::fstream&>(m_File).seekg(0, std::ios::end);
        const_cast<std::fstream&>(m_File).seekp(0, std::ios::end);

        Core::u64 length = GetPosition();

        // Restore pos
        const_cast<std::fstream&>(m_File).seekg(currentPos, std::ios::beg);
        const_cast<std::fstream&>(m_File).seekp(currentPos, std::ios::beg);

        return length;
    }

    Core::Result<bool> FileStream::Seek(Core::i64 offset, SeekOrigin origin) {
        if (!m_File.is_open()) return Core::Result<bool>::Error("File is not open");

        std::ios_base::seekdir dir;
        switch (origin) {
            case SeekOrigin::Begin: dir = std::ios::beg; break;
            case SeekOrigin::Current: dir = std::ios::cur; break;
            case SeekOrigin::End: dir = std::ios::end; break;
            default: return Core::Result<bool>::Error("Invalid SeekOrigin");
        }

        m_File.seekg(offset, dir);
        m_File.seekp(offset, dir);

        if (m_File.fail()) {
            m_File.clear(); // Clear error flags
            return Core::Result<bool>::Error("Seek operation failed");
        }
        return true;
    }

    Core::Result<Core::u64> FileStream::Read(void* buffer, Core::u64 size) {
        if (!m_File.is_open() || !CanRead()) return Core::Result<Core::u64>::Error("File is not open for reading");

        m_File.read(reinterpret_cast<char*>(buffer), size);
        return static_cast<Core::u64>(m_File.gcount());
    }

    Core::Result<Core::u64> FileStream::Write(const void* buffer, Core::u64 size) {
        if (!m_File.is_open() || !CanWrite()) return Core::Result<Core::u64>::Error("File is not open for writing");

        m_File.write(reinterpret_cast<const char*>(buffer), size);
        if (m_File.fail()) {
            return Core::Result<Core::u64>::Error("Write operation failed");
        }
        return size;
    }

    void FileStream::Flush() {
        if (m_File.is_open()) {
            m_File.flush();
        }
    }

    void FileStream::Close() {
        if (m_File.is_open()) {
            m_File.close();
        }
    }
}
