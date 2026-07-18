#pragma once

#include "FileSystem/Stream.h"
#include "FileSystem/Path.h"
#include <fstream>

namespace DungeonEngine::FileSystem {

    enum class FileMode {
        Read,
        Write,
        Append,
        ReadWrite
    };

    class FileStream : public IStream {
    public:
        FileStream(const Path& path, FileMode mode);
        ~FileStream() override;

        bool IsOpen() const { return m_File.is_open(); }

        bool CanRead() const override;
        bool CanWrite() const override;
        bool CanSeek() const override { return true; }

        Core::u64 GetPosition() const override;
        Core::u64 GetLength() const override;

        Core::Result<bool> Seek(Core::i64 offset, SeekOrigin origin) override;
        Core::Result<Core::u64> Read(void* buffer, Core::u64 size) override;
        Core::Result<Core::u64> Write(const void* buffer, Core::u64 size) override;

        void Flush() override;
        void Close() override;

    private:
        Path m_Path;
        FileMode m_Mode;
        mutable std::fstream m_File;
    };
}
