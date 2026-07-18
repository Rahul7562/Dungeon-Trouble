#pragma once

#include "FileSystem/Stream.h"
#include <vector>
#include <cstring>

namespace DungeonEngine::FileSystem {

    class MemoryStream : public IStream {
    public:
        MemoryStream() : m_Position(0) {}
        MemoryStream(const Core::u8* data, Core::u64 size) : m_Position(0) {
            m_Buffer.assign(data, data + size);
        }

        bool CanRead() const override { return true; }
        bool CanWrite() const override { return true; }
        bool CanSeek() const override { return true; }

        Core::u64 GetPosition() const override { return m_Position; }
        Core::u64 GetLength() const override { return m_Buffer.size(); }

        Core::Result<bool> Seek(Core::i64 offset, SeekOrigin origin) override {
            Core::i64 newPos = 0;
            switch (origin) {
                case SeekOrigin::Begin: newPos = offset; break;
                case SeekOrigin::Current: newPos = static_cast<Core::i64>(m_Position) + offset; break;
                case SeekOrigin::End: newPos = static_cast<Core::i64>(m_Buffer.size()) + offset; break;
                default: return Core::Result<bool>::Error("Invalid SeekOrigin");
            }

            if (newPos < 0 || newPos > static_cast<Core::i64>(m_Buffer.size())) {
                return Core::Result<bool>::Error("Seek out of bounds");
            }

            m_Position = static_cast<Core::u64>(newPos);
            return true;
        }

        Core::Result<Core::u64> Read(void* buffer, Core::u64 size) override {
            Core::u64 available = m_Buffer.size() - m_Position;
            Core::u64 toRead = (size > available) ? available : size;

            if (toRead > 0) {
                std::memcpy(buffer, m_Buffer.data() + m_Position, toRead);
                m_Position += toRead;
            }
            return toRead;
        }

        Core::Result<Core::u64> Write(const void* buffer, Core::u64 size) override {
            Core::u64 newSize = m_Position + size;
            if (newSize > m_Buffer.size()) {
                m_Buffer.resize(newSize);
            }

            std::memcpy(m_Buffer.data() + m_Position, buffer, size);
            m_Position += size;
            return size;
        }

        void Flush() override {} // No-op for memory stream
        void Close() override {} // No-op for memory stream

        const std::vector<Core::u8>& GetBuffer() const { return m_Buffer; }

    private:
        std::vector<Core::u8> m_Buffer;
        Core::u64 m_Position;
    };
}
