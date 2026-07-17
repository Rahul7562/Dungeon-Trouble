#include "catch_amalgamated.hpp"
#include "FileSystem/MemoryStream.h"
#include "FileSystem/StreamReaders.h"
#include "FileSystem/StreamWriters.h"

using namespace DungeonEngine::FileSystem;
using namespace Core;

TEST_CASE("Stream Basic Operations", "[FileSystem][Stream]") {
    SECTION("Memory Stream Write and Read") {
        MemoryStream stream;
        BinaryWriter writer(&stream);
        BinaryReader reader(&stream);

        u32 testVal = 42;
        String testStr = "Dungeon";

        REQUIRE(writer.Write(testVal).IsOk());

        // Write string length manually for simplicity in this test
        REQUIRE(writer.Write(static_cast<u32>(testStr.length())).IsOk());
        REQUIRE(writer.WriteString(testStr).IsOk());

        REQUIRE(stream.Seek(0, SeekOrigin::Begin).IsOk());

        auto readVal = reader.Read<u32>();
        REQUIRE(readVal.IsOk());
        REQUIRE(readVal.Get() == 42);

        auto len = reader.Read<u32>();
        REQUIRE(len.IsOk());
        REQUIRE(len.Get() == testStr.length());

        auto readStr = reader.ReadString(len.Get());
        REQUIRE(readStr.IsOk());
        REQUIRE(readStr.Get() == testStr);
    }
}
