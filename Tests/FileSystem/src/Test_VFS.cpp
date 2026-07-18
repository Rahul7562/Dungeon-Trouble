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

    SECTION("ResolvePhysicalPath security test") {
        Path physicalRoot = Directory::GetCurrentWorkingDirectory();
        VirtualFileSystem::Get().Mount(Path("/assets"), physicalRoot, true);

        auto resolvedValid = VirtualFileSystem::Get().ResolvePhysicalPath(Path("/assets/textures/player.png"));
        REQUIRE(resolvedValid.IsOk());

        auto resolvedInvalid = VirtualFileSystem::Get().ResolvePhysicalPath(Path("/assets/../../etc/passwd"));
        REQUIRE(resolvedInvalid.IsError());

        VirtualFileSystem::Get().Unmount(Path("/assets"));
    }

    VirtualFileSystem::Get().Shutdown();
}
