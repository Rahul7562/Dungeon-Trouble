#pragma once

#include "Core/Types.h"
#include "Core/Result.h"
#include "FileSystem/StreamReaders.h"
#include "FileSystem/StreamWriters.h"
#include <type_traits>

namespace DungeonEngine::FileSystem {

    namespace Serialization {

        template<typename T>
        Core::Result<bool> WritePod(BinaryWriter& writer, const T& pod) {
            static_assert(std::is_standard_layout_v<T> && std::is_trivial_v<T>, "Type must be POD");
            return writer.Write(pod);
        }

        template<typename T>
        Core::Result<T> ReadPod(BinaryReader& reader) {
            static_assert(std::is_standard_layout_v<T> && std::is_trivial_v<T>, "Type must be POD");
            return reader.Read<T>();
        }

        inline Core::Result<bool> WriteString(BinaryWriter& writer, const Core::String& str) {
            // Write length then characters
            Core::u32 length = static_cast<Core::u32>(str.length());
            auto res = writer.Write(length);
            if (res.IsError()) return res;

            if (length > 0) {
                return writer.WriteString(str);
            }
            return true;
        }

        inline Core::Result<Core::String> ReadString(BinaryReader& reader) {
            auto lengthRes = reader.Read<Core::u32>();
            if (lengthRes.IsError()) return Core::Result<Core::String>::Error(lengthRes.GetError());

            Core::u32 length = lengthRes.Get();
            if (length > 0) {
                return reader.ReadString(length);
            }
            return Core::String("");
        }
    }

}
