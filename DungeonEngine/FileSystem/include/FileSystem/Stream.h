#pragma once

#include "Core/Types.h"
#include "Core/Result.h"

namespace DungeonEngine::FileSystem {

    enum class SeekOrigin {
        Begin,
        Current,
        End
    };

    class IStream {
    public:
        virtual ~IStream() = default;

        virtual bool CanRead() const = 0;
        virtual bool CanWrite() const = 0;
        virtual bool CanSeek() const = 0;

        virtual Core::u64 GetPosition() const = 0;
        virtual Core::u64 GetLength() const = 0;

        virtual Core::Result<bool> Seek(Core::i64 offset, SeekOrigin origin) = 0;
        virtual Core::Result<Core::u64> Read(void* buffer, Core::u64 size) = 0;
        virtual Core::Result<Core::u64> Write(const void* buffer, Core::u64 size) = 0;

        virtual void Flush() = 0;
        virtual void Close() = 0;
    };

}
