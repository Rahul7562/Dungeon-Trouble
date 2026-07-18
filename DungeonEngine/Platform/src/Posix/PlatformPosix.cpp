#include "Core/Platform.h"
#if defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)

#include "PlatformPosix.h"
#include <unistd.h>
#include <sys/utsname.h>
#include <sys/time.h>
#include <time.h>
#include <dlfcn.h>
#include <cstdlib>
#include <cstring>
#include <limits.h>
#include <sys/wait.h>
#include <vector>

#if defined(DT_PLATFORM_LINUX)
#include <sys/sysinfo.h>
#elif defined(DT_PLATFORM_APPLE)
#include <mach/mach.h>
#include <mach/mach_host.h>
#include <sys/sysctl.h>
#endif

namespace DungeonEngine::Platform {

    // --- PosixSystemInfo ---
    CpuInfo PosixSystemInfo::getCpuInfo() const {
        CpuInfo info;
        info.vendor = "Unknown";
        info.model = "Unknown POSIX CPU";
        info.numCores = sysconf(_SC_NPROCESSORS_ONLN);
        info.numLogicalProcessors = sysconf(_SC_NPROCESSORS_CONF);
        return info;
    }

    MemoryInfo PosixSystemInfo::getMemoryInfo() const {
        MemoryInfo info = {};
#if defined(DT_PLATFORM_LINUX)
        struct sysinfo sys_info;
        if (sysinfo(&sys_info) == 0) {
            info.totalPhysicalMemoryBytes = (Core::u64)sys_info.totalram * sys_info.mem_unit;
            info.availablePhysicalMemoryBytes = (Core::u64)sys_info.freeram * sys_info.mem_unit;
        }
#elif defined(DT_PLATFORM_APPLE)
        int mib[2] = { CTL_HW, HW_MEMSIZE };
        size_t length = sizeof(Core::u64);
        sysctl(mib, 2, &info.totalPhysicalMemoryBytes, &length, NULL, 0);
        info.availablePhysicalMemoryBytes = info.totalPhysicalMemoryBytes; // Simplified
#endif
        return info;
    }

    OsInfo PosixSystemInfo::getOsInfo() const {
        OsInfo info;
        struct utsname buffer;
        if (uname(&buffer) == 0) {
            info.name = buffer.sysname;
            info.version = buffer.release;
        } else {
            info.name = "Unknown POSIX";
            info.version = "Unknown";
        }
        info.is64Bit = sizeof(void*) == 8;
        return info;
    }

    Core::String PosixSystemInfo::getArchitecture() const {
#if defined(DT_ARCH_X64)
        return "x64";
#elif defined(DT_ARCH_X86)
        return "x86";
#elif defined(DT_ARCH_ARM64)
        return "ARM64";
#else
        return "Unknown";
#endif
    }

    Core::String PosixSystemInfo::getCompilerInfo() const {
#if defined(DT_COMPILER_CLANG)
        return "Clang";
#elif defined(DT_COMPILER_GCC)
        return "GCC";
#else
        return "Unknown";
#endif
    }

    // --- PosixEnvironment ---
    Core::String PosixEnvironment::getExecutableDirectory() const {
        char buffer[PATH_MAX];
#if defined(DT_PLATFORM_LINUX)
        ssize_t len = readlink("/proc/self/exe", buffer, sizeof(buffer) - 1);
        if (len != -1) {
            buffer[len] = '\0';
            Core::String path(buffer);
            size_t pos = path.find_last_of("/");
            return (pos != Core::String::npos) ? path.substr(0, pos) : path;
        }
#elif defined(DT_PLATFORM_APPLE)
        // Simplified for macOS for now. In real implementation use _NSGetExecutablePath
        return ".";
#endif
        return ".";
    }

    Core::String PosixEnvironment::getWorkingDirectory() const {
        char buffer[PATH_MAX];
        if (getcwd(buffer, sizeof(buffer)) != nullptr) {
            return Core::String(buffer);
        }
        return ".";
    }

    Core::String PosixEnvironment::getUserHomeDirectory() const {
        const char* home = getenv("HOME");
        return home ? Core::String(home) : "";
    }

    Core::String PosixEnvironment::getTemporaryDirectory() const {
        const char* temp = getenv("TMPDIR");
        return temp ? Core::String(temp) : "/tmp";
    }

    Core::String PosixEnvironment::getApplicationDataDirectory() const {
        Core::String home = getUserHomeDirectory();
        if (home.empty()) return "";
#if defined(DT_PLATFORM_APPLE)
        return home + "/Library/Application Support";
#else
        return home + "/.config";
#endif
    }

    std::optional<Core::String> PosixEnvironment::getEnvironmentVariable(const Core::String& name) const {
        const char* val = getenv(name.c_str());
        if (val) {
            return Core::String(val);
        }
        return std::nullopt;
    }

    bool PosixEnvironment::setEnvironmentVariable(const Core::String& name, const Core::String& value) {
        return setenv(name.c_str(), value.c_str(), 1) == 0;
    }

    // --- PosixProcess ---
    void PosixProcess::exit(Core::i32 exitCode) {
        std::exit(exitCode);
    }

    bool PosixProcess::execute(const Core::String& executablePath, const std::vector<Core::String>& arguments, Core::i32& outExitCode) {
        pid_t pid = fork();
        if (pid == -1) {
            return false;
        } else if (pid == 0) {
            std::vector<char*> args;
            args.push_back(const_cast<char*>(executablePath.c_str()));
            for (const auto& arg : arguments) {
                args.push_back(const_cast<char*>(arg.c_str()));
            }
            args.push_back(nullptr);
            execvp(executablePath.c_str(), args.data());
            std::exit(1);
        } else {
            int status;
            if (waitpid(pid, &status, 0) == -1) {
                return false;
            }
            if (WIFEXITED(status)) {
                outExitCode = WEXITSTATUS(status);
                return true;
            }
            return false;
        }
    }

    // --- PosixTime ---
    Core::f64 PosixTime::getAbsoluteTimeSeconds() const {
#if defined(DT_PLATFORM_LINUX) || defined(DT_PLATFORM_APPLE)
        struct timespec ts;
        clock_gettime(CLOCK_MONOTONIC, &ts);
        return static_cast<double>(ts.tv_sec) + static_cast<double>(ts.tv_nsec) / 1000000000.0;
#else
        struct timeval tv;
        gettimeofday(&tv, nullptr);
        return static_cast<double>(tv.tv_sec) + static_cast<double>(tv.tv_usec) / 1000000.0;
#endif
    }

    void PosixTime::sleep(Core::u32 milliseconds) {
        usleep(milliseconds * 1000);
    }

    // --- PosixClipboard ---
    std::optional<Core::String> PosixClipboard::getText() const {
        // Implementing clipboard for Linux/macOS requires interacting with X11/Wayland/Cocoa
        // This is a stub for the interface.
        return std::nullopt;
    }

    bool PosixClipboard::setText(const Core::String& text) {
        (void)text;
        return false;
    }

    // --- PosixDynamicLibrary ---
    PosixDynamicLibrary::~PosixDynamicLibrary() {
        unload();
    }

    bool PosixDynamicLibrary::load(const Core::String& path) {
        if (m_Handle) unload();
        m_Handle = dlopen(path.c_str(), RTLD_NOW | RTLD_LOCAL);
        return m_Handle != nullptr;
    }

    void PosixDynamicLibrary::unload() {
        if (m_Handle) {
            dlclose(m_Handle);
            m_Handle = nullptr;
        }
    }

    void* PosixDynamicLibrary::getSymbol(const Core::String& symbolName) const {
        if (!m_Handle) return nullptr;
        return dlsym(m_Handle, symbolName.c_str());
    }

    bool PosixDynamicLibrary::isLoaded() const {
        return m_Handle != nullptr;
    }
}
#endif
