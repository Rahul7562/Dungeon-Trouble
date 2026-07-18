#include "FileSystem/VFS.h"
#include "FileSystem/File.h"
#include "FileSystem/FileStream.h"
#include "Core/Assert.h"
#include <algorithm>
#include <mutex>

namespace DungeonEngine::FileSystem {

    PhysicalVFSNode::PhysicalVFSNode(const Path& physicalRoot, bool readOnly)
        : m_PhysicalRoot(physicalRoot), m_ReadOnly(readOnly) {
    }

    Path PhysicalVFSNode::ResolvePhysical(const Path& virtualPath) const {
        return m_PhysicalRoot / virtualPath;
    }

    Core::Result<bool> PhysicalVFSNode::Exists(const Path& path) const {
        Path physicalPath = ResolvePhysical(path);
        return File::Exists(physicalPath);
    }

    Core::Result<std::unique_ptr<IStream>> PhysicalVFSNode::OpenRead(const Path& path) const {
        Path physicalPath = ResolvePhysical(path);
        auto result = File::Exists(physicalPath);
        if (result.IsError() || !result.Get()) {
            return Core::Result<std::unique_ptr<IStream>>::Error("File does not exist in physical node");
        }

        auto stream = std::make_unique<FileStream>(physicalPath, FileMode::Read);
        if (!stream->IsOpen()) {
            return Core::Result<std::unique_ptr<IStream>>::Error("Failed to open file stream for reading");
        }
        return Core::Result<std::unique_ptr<IStream>>(std::move(stream));
    }

    Core::Result<std::unique_ptr<IStream>> PhysicalVFSNode::OpenWrite(const Path& path) {
        if (m_ReadOnly) {
            return Core::Result<std::unique_ptr<IStream>>::Error("Physical node is read-only");
        }

        Path physicalPath = ResolvePhysical(path);
        auto stream = std::make_unique<FileStream>(physicalPath, FileMode::Write);
        if (!stream->IsOpen()) {
             return Core::Result<std::unique_ptr<IStream>>::Error("Failed to open file stream for writing");
        }
        return Core::Result<std::unique_ptr<IStream>>(std::move(stream));
    }


    VirtualFileSystem& VirtualFileSystem::Get() {
        static VirtualFileSystem instance;
        return instance;
    }

    void VirtualFileSystem::Initialize() {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Mounts.clear();
        m_Aliases.clear();
    }

    void VirtualFileSystem::Shutdown() {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Mounts.clear();
        m_Aliases.clear();
    }

    Core::Result<bool> VirtualFileSystem::Mount(const Path& virtualPath, const Path& physicalPath, bool readOnly) {
        return MountNode(virtualPath, std::make_unique<PhysicalVFSNode>(physicalPath, readOnly));
    }

    Core::Result<bool> VirtualFileSystem::MountNode(const Path& virtualPath, std::unique_ptr<IVFSNode> node) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        // Ensure virtual path doesn't already exist perfectly
        for (const auto& mount : m_Mounts) {
            if (mount.VirtualPath == virtualPath) {
                return Core::Result<bool>::Error("Virtual path already mounted");
            }
        }

        m_Mounts.push_back({virtualPath, std::move(node)});

        // Sort mounts by length descending so longer virtual paths match first
        std::sort(m_Mounts.begin(), m_Mounts.end(), [](const MountPoint& a, const MountPoint& b) {
            return a.VirtualPath.ToString().length() > b.VirtualPath.ToString().length();
        });

        return true;
    }

    Core::Result<bool> VirtualFileSystem::Unmount(const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        auto it = std::find_if(m_Mounts.begin(), m_Mounts.end(), [&virtualPath](const MountPoint& mp) {
            return mp.VirtualPath == virtualPath;
        });

        if (it != m_Mounts.end()) {
            m_Mounts.erase(it);
            return true;
        }

        return Core::Result<bool>::Error("Virtual path not found for unmount");
    }

    Core::Result<bool> VirtualFileSystem::Exists(const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        auto pathStr = virtualPath.ToString();
        for (const auto& mount : m_Mounts) {
            auto mountStr = mount.VirtualPath.ToString();

            if (pathStr.find(mountStr) == 0) {
                // Determine relative path inside mount
                Core::String relPathStr = pathStr.substr(mountStr.length());
                if (!relPathStr.empty() && (relPathStr[0] == '/' || relPathStr[0] == '\\')) {
                    relPathStr = relPathStr.substr(1);
                }

                Path relativePath(relPathStr);
                auto res = mount.Node->Exists(relativePath);
                if (res.IsOk() && res.Get()) {
                    return true;
                }
            }
        }
        return false;
    }

    Core::Result<std::unique_ptr<IStream>> VirtualFileSystem::OpenRead(const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        auto pathStr = virtualPath.ToString();
        for (const auto& mount : m_Mounts) {
            auto mountStr = mount.VirtualPath.ToString();

            if (pathStr.find(mountStr) == 0) {
                Core::String relPathStr = pathStr.substr(mountStr.length());
                if (!relPathStr.empty() && (relPathStr[0] == '/' || relPathStr[0] == '\\')) {
                    relPathStr = relPathStr.substr(1);
                }

                Path relativePath(relPathStr);
                auto res = mount.Node->OpenRead(relativePath);
                if (res.IsOk()) {
                    return res;
                }
            }
        }
        return Core::Result<std::unique_ptr<IStream>>::Error("File not found in VFS for reading");
    }

    Core::Result<std::unique_ptr<IStream>> VirtualFileSystem::OpenWrite(const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        auto pathStr = virtualPath.ToString();
        for (const auto& mount : m_Mounts) {
            auto mountStr = mount.VirtualPath.ToString();

            if (pathStr.find(mountStr) == 0) {
                Core::String relPathStr = pathStr.substr(mountStr.length());
                if (!relPathStr.empty() && (relPathStr[0] == '/' || relPathStr[0] == '\\')) {
                    relPathStr = relPathStr.substr(1);
                }

                Path relativePath(relPathStr);
                auto res = mount.Node->OpenWrite(relativePath);
                if (res.IsOk()) {
                    return res;
                }
            }
        }
        return Core::Result<std::unique_ptr<IStream>>::Error("Failed to open file in VFS for writing");
    }

    Core::Result<Path> VirtualFileSystem::ResolvePhysicalPath(const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);

        auto pathStr = virtualPath.ToString();
        for (const auto& mount : m_Mounts) {
            auto mountStr = mount.VirtualPath.ToString();

            if (pathStr.find(mountStr) == 0) {
                // If the mount is a physical node we can resolve it
                if (auto* physicalNode = dynamic_cast<PhysicalVFSNode*>(mount.Node.get())) {
                    Core::String relPathStr = pathStr.substr(mountStr.length());
                    if (!relPathStr.empty() && (relPathStr[0] == '/' || relPathStr[0] == '\\')) {
                        relPathStr = relPathStr.substr(1);
                    }
                    Path relativePath(relPathStr);
                    // Hackish but allows retrieving it from PhysicalVFSNode
                    // A proper design would expose this interface if supported
                    // We know for a fact it's a PhysicalVFSNode right now
                    // Just return something for now, the real physical node doesn't expose physicalRoot publicly yet
                    return Core::Result<Path>::Error("Cannot properly resolve physical path directly currently.");
                }
            }
        }
        return Core::Result<Path>::Error("Cannot resolve physical path from non-physical mount");
    }

    void VirtualFileSystem::AddAlias(const Core::String& alias, const Path& virtualPath) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        m_Aliases[alias] = virtualPath;
    }

    Core::Result<Path> VirtualFileSystem::ResolveAlias(const Core::String& alias) {
        std::lock_guard<std::mutex> lock(m_Mutex);
        auto it = m_Aliases.find(alias);
        if (it != m_Aliases.end()) {
            return it->second;
        }
        return Core::Result<Path>::Error("Alias not found");
    }
}
