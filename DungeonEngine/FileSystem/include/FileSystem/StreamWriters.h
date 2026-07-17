#pragma once

#include "FileSystem/Stream.h"
#include <string>

namespace DungeonEngine::FileSystem {

    class BinaryWriter {
    public:
        BinaryWriter(IStream* stream) : m_Stream(stream) {}

        template<typename T>
        Core::Result<bool> Write(const T& value) {
            auto result = m_Stream->Write(&value, sizeof(T));
            if (result.IsError() || result.Get() != sizeof(T)) {
                return Core::Result<bool>::Error("Failed to write type to stream");
            }
            return true;
        }

        Core::Result<bool> WriteString(const Core::String& str) {
            auto result = m_Stream->Write(str.data(), str.length());
            if (result.IsError() || result.Get() != str.length()) {
                return Core::Result<bool>::Error("Failed to write string to stream");
            }
            return true;
        }

    private:
        IStream* m_Stream;
    };

    class TextWriter {
    public:
        TextWriter(IStream* stream) : m_Stream(stream) {}

        Core::Result<bool> Write(const Core::String& str) {
            auto result = m_Stream->Write(str.data(), str.length());
            if (result.IsError() || result.Get() != str.length()) {
                return Core::Result<bool>::Error("Failed to write text to stream");
            }
            return true;
        }

        Core::Result<bool> WriteLine(const Core::String& str) {
            auto res1 = Write(str);
            if (res1.IsError()) return res1;

            Core::String newline = "\n";
            return Write(newline);
        }

    private:
        IStream* m_Stream;
    };

}
