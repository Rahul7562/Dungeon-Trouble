#pragma once

#include "FileSystem/Stream.h"
#include <string>

namespace DungeonEngine::FileSystem {

    class BinaryReader {
    public:
        BinaryReader(IStream* stream) : m_Stream(stream) {}

        template<typename T>
        Core::Result<T> Read() {
            T value;
            auto result = m_Stream->Read(&value, sizeof(T));
            if (result.IsError() || result.Get() != sizeof(T)) {
                return Core::Result<T>::Error("Failed to read type from stream");
            }
            return value;
        }

        Core::Result<Core::String> ReadString(Core::u64 length) {
            Core::String str;
            str.resize(length);
            auto result = m_Stream->Read(str.data(), length);
            if (result.IsError() || result.Get() != length) {
                return Core::Result<Core::String>::Error("Failed to read string from stream");
            }
            return str;
        }

    private:
        IStream* m_Stream;
    };

    class TextReader {
    public:
        TextReader(IStream* stream) : m_Stream(stream) {}

        Core::Result<Core::String> ReadLine() {
            Core::String line;
            char c;
            while (true) {
                auto result = m_Stream->Read(&c, 1);
                if (result.IsError() || result.Get() == 0) {
                    if (line.empty()) return Core::Result<Core::String>::Error("End of stream or error");
                    break; // EOF
                }

                if (c == '\n') {
                    break;
                }
                if (c != '\r') {
                    line += c;
                }
            }
            return line;
        }

        Core::Result<Core::String> ReadToEnd() {
            Core::u64 length = m_Stream->GetLength() - m_Stream->GetPosition();
            Core::String str;
            str.resize(length);
            auto result = m_Stream->Read(str.data(), length);
            if (result.IsError()) {
                return Core::Result<Core::String>::Error(result.GetError());
            }
            str.resize(result.Get()); // Actual read size
            return str;
        }

    private:
        IStream* m_Stream;
    };

}
