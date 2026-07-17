#include "catch_amalgamated.hpp"
#include "FileSystem/VFS.h"
#include "FileSystem/Directory.h"

using namespace DungeonEngine::FileSystem;
using namespace Core;

TEST_CASE("VFS Basic Operations", "[FileSystem][VFS]") {
    VirtualFileSystem::Get().Initialize();

    SECTION("Mounting and unmounting") {
        Path physicalRoot = Directory::GetCurrentWorkingDirectory();

        auto mountRes = VirtualFileSystem::Get().Mount(Path("/assets"), physicalRoot, true);
        REQUIRE(mountRes.IsOk());

        auto unmountRes = VirtualFileSystem::Get().Unmount(Path("/assets"));
        REQUIRE(unmountRes.IsOk());
    }

    VirtualFileSystem::Get().Shutdown();
}
