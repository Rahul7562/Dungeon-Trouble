#pragma once

#include "FileSystem/Path.h"
#include "FileSystem/Stream.h"
#include "Core/Result.h"
#include "Core/Types.h"
#include <vector>
#include <unordered_map>
#include <memory>
#include <mutex>

namespace DungeonEngine::FileSystem {

    // Base class for VFS nodes (Physical paths, Archives, etc)
    class IVFSNode {
    public:
        virtual ~IVFSNode() = default;
        virtual Core::Result<bool> Exists(const Path& path) const = 0;
        virtual Core::Result<std::unique_ptr<IStream>> OpenRead(const Path& path) const = 0;
        virtual Core::Result<std::unique_ptr<IStream>> OpenWrite(const Path& path) = 0;
        virtual bool IsReadOnly() const = 0;
    };

    class PhysicalVFSNode : public IVFSNode {
    public:
        PhysicalVFSNode(const Path& physicalRoot, bool readOnly);

        Core::Result<bool> Exists(const Path& path) const override;
        Core::Result<std::unique_ptr<IStream>> OpenRead(const Path& path) const override;
        Core::Result<std::unique_ptr<IStream>> OpenWrite(const Path& path) override;
        bool IsReadOnly() const override { return m_ReadOnly; }

    private:
        Path ResolvePhysical(const Path& virtualPath) const;
        Path m_PhysicalRoot;
        bool m_ReadOnly;
    };

    class VirtualFileSystem {
    public:
        static VirtualFileSystem& Get();

        void Initialize();
        void Shutdown();

        // Mounts a physical directory to a virtual path
        Core::Result<bool> Mount(const Path& virtualPath, const Path& physicalPath, bool readOnly = true);

        // Mounts an arbitrary node (useful for archives like ZIP later)
        Core::Result<bool> MountNode(const Path& virtualPath, std::unique_ptr<IVFSNode> node);

        Core::Result<bool> Unmount(const Path& virtualPath);

        // Core VFS operations
        Core::Result<bool> Exists(const Path& virtualPath);
        Core::Result<std::unique_ptr<IStream>> OpenRead(const Path& virtualPath);
        Core::Result<std::unique_ptr<IStream>> OpenWrite(const Path& virtualPath);

        // Resolves a virtual path to a physical path (if it points to a physical node)
        Core::Result<Path> ResolvePhysicalPath(const Path& virtualPath);

        // Add alias support
        void AddAlias(const Core::String& alias, const Path& virtualPath);
        Core::Result<Path> ResolveAlias(const Core::String& alias);

    private:
        VirtualFileSystem() = default;
        ~VirtualFileSystem() = default;

        VirtualFileSystem(const VirtualFileSystem&) = delete;
        VirtualFileSystem& operator=(const VirtualFileSystem&) = delete;

        struct MountPoint {
            Path VirtualPath;
            std::unique_ptr<IVFSNode> Node;
        };

        // Thread safety for VFS modifications
        std::mutex m_Mutex;
        std::vector<MountPoint> m_Mounts;
        std::unordered_map<Core::String, Path> m_Aliases;
    };

}
