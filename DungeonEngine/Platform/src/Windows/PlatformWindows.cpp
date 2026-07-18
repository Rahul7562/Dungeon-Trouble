#include "Core/Platform.h"
#if defined(DT_PLATFORM_WINDOWS)

#include "PlatformWindows.h"
#include <vector>
#include <intrin.h>

namespace DungeonEngine::Platform {

    // --- WindowsSystemInfo ---
    CpuInfo WindowsSystemInfo::getCpuInfo() const {
        CpuInfo info;
        int cpuInfo[4] = {-1};
        char vendor[13];
        __cpuid(cpuInfo, 0);
        memcpy(vendor, &cpuInfo[1], 4);
        memcpy(vendor + 4, &cpuInfo[3], 4);
        memcpy(vendor + 8, &cpuInfo[2], 4);
        vendor[12] = '\0';
        info.vendor = vendor;
        info.model = "Unknown Windows CPU"; // Simplified for this milestone

        SYSTEM_INFO sysInfo;
        GetSystemInfo(&sysInfo);
        info.numLogicalProcessors = sysInfo.dwNumberOfProcessors;
        info.numCores = sysInfo.dwNumberOfProcessors; // Simplification
        return info;
    }

    MemoryInfo WindowsSystemInfo::getMemoryInfo() const {
        MEMORYSTATUSEX statex;
        statex.dwLength = sizeof(statex);
        GlobalMemoryStatusEx(&statex);

        MemoryInfo info;
        info.totalPhysicalMemoryBytes = statex.ullTotalPhys;
        info.availablePhysicalMemoryBytes = statex.ullAvailPhys;
        info.totalVirtualMemoryBytes = statex.ullTotalVirtual;
        info.availableVirtualMemoryBytes = statex.ullAvailVirtual;
        return info;
    }

    OsInfo WindowsSystemInfo::getOsInfo() const {
        OsInfo info;
        info.name = "Windows";
        info.version = "Unknown";

        SYSTEM_INFO sysInfo;
        GetNativeSystemInfo(&sysInfo);
        info.is64Bit = (sysInfo.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_AMD64 ||
                        sysInfo.wProcessorArchitecture == PROCESSOR_ARCHITECTURE_ARM64);
        return info;
    }

    Core::String WindowsSystemInfo::getArchitecture() const {
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

    Core::String WindowsSystemInfo::getCompilerInfo() const {
#if defined(DT_COMPILER_MSVC)
        return "MSVC";
#elif defined(DT_COMPILER_CLANG)
        return "Clang";
#elif defined(DT_COMPILER_GCC)
        return "GCC";
#else
        return "Unknown";
#endif
    }

    // --- WindowsEnvironment ---
    Core::String WindowsEnvironment::getExecutableDirectory() const {
        char buffer[MAX_PATH];
        GetModuleFileNameA(NULL, buffer, MAX_PATH);
        Core::String path(buffer);
        size_t pos = path.find_last_of("\\/");
        return (pos != Core::String::npos) ? path.substr(0, pos) : path;
    }

    Core::String WindowsEnvironment::getWorkingDirectory() const {
        char buffer[MAX_PATH];
        GetCurrentDirectoryA(MAX_PATH, buffer);
        return Core::String(buffer);
    }

    Core::String WindowsEnvironment::getUserHomeDirectory() const {
        const char* home = getenv("USERPROFILE");
        return home ? Core::String(home) : "";
    }

    Core::String WindowsEnvironment::getTemporaryDirectory() const {
        char buffer[MAX_PATH];
        GetTempPathA(MAX_PATH, buffer);
        return Core::String(buffer);
    }

    Core::String WindowsEnvironment::getApplicationDataDirectory() const {
        const char* appdata = getenv("APPDATA");
        return appdata ? Core::String(appdata) : "";
    }

    std::optional<Core::String> WindowsEnvironment::getEnvironmentVariable(const Core::String& name) const {
        char buffer[32767];
        DWORD result = GetEnvironmentVariableA(name.c_str(), buffer, sizeof(buffer));
        if (result > 0 && result < sizeof(buffer)) {
            return Core::String(buffer);
        }
        return std::nullopt;
    }

    bool WindowsEnvironment::setEnvironmentVariable(const Core::String& name, const Core::String& value) {
        return SetEnvironmentVariableA(name.c_str(), value.c_str()) != 0;
    }

    // --- WindowsProcess ---
    void WindowsProcess::exit(Core::i32 exitCode) {
        ExitProcess(exitCode);
    }

    bool WindowsProcess::execute(const Core::String& executablePath, const std::vector<Core::String>& arguments, Core::i32& outExitCode) {
        Core::String cmdLine = executablePath;
        for (const auto& arg : arguments) {
            cmdLine += " " + arg;
        }
        STARTUPINFOA si;
        PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));
        if (!CreateProcessA(executablePath.empty() ? nullptr : executablePath.c_str(),
                            cmdLine.empty() ? nullptr : cmdLine.data(),
                            nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi)) {
            return false;
        }
        WaitForSingleObject(pi.hProcess, INFINITE);
        DWORD exitCode;
        if (GetExitCodeProcess(pi.hProcess, &exitCode)) {
            outExitCode = static_cast<Core::i32>(exitCode);
        } else {
            outExitCode = -1;
        }
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return true;
    }

    // --- WindowsTime ---
    WindowsTime::WindowsTime() {
        LARGE_INTEGER freq;
        QueryPerformanceFrequency(&freq);
        m_ClockFrequency = 1.0 / static_cast<double>(freq.QuadPart);
    }

    Core::f64 WindowsTime::getAbsoluteTimeSeconds() const {
        LARGE_INTEGER time;
        QueryPerformanceCounter(&time);
        return static_cast<double>(time.QuadPart) * m_ClockFrequency;
    }

    void WindowsTime::sleep(Core::u32 milliseconds) {
        Sleep(milliseconds);
    }

    // --- WindowsClipboard ---
    std::optional<Core::String> WindowsClipboard::getText() const {
        if (!OpenClipboard(nullptr)) return std::nullopt;
        HANDLE hData = GetClipboardData(CF_UNICODETEXT);
        if (!hData) {
            CloseClipboard();
            return std::nullopt;
        }
        wchar_t* pszText = static_cast<wchar_t*>(GlobalLock(hData));
        if (!pszText) {
            CloseClipboard();
            return std::nullopt;
        }
        int len = WideCharToMultiByte(CP_UTF8, 0, pszText, -1, nullptr, 0, nullptr, nullptr);
        if (len <= 0) {
            GlobalUnlock(hData);
            CloseClipboard();
            return std::nullopt;
        }
        Core::String text(len - 1, '\0');
        WideCharToMultiByte(CP_UTF8, 0, pszText, -1, text.data(), len, nullptr, nullptr);
        GlobalUnlock(hData);
        CloseClipboard();
        return text;
    }

    bool WindowsClipboard::setText(const Core::String& text) {
        if (!OpenClipboard(nullptr)) return false;
        EmptyClipboard();
        int len = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, nullptr, 0);
        if (len <= 0) {
            CloseClipboard();
            return false;
        }
        HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, len * sizeof(wchar_t));
        if (!hMem) {
            CloseClipboard();
            return false;
        }
        wchar_t* pszText = static_cast<wchar_t*>(GlobalLock(hMem));
        MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, pszText, len);
        GlobalUnlock(hMem);
        SetClipboardData(CF_UNICODETEXT, hMem);
        CloseClipboard();
        return true;
    }

    // --- WindowsDynamicLibrary ---
    WindowsDynamicLibrary::~WindowsDynamicLibrary() {
        unload();
    }

    bool WindowsDynamicLibrary::load(const Core::String& path) {
        if (m_Handle) unload();
        m_Handle = LoadLibraryA(path.c_str());
        return m_Handle != nullptr;
    }

    void WindowsDynamicLibrary::unload() {
        if (m_Handle) {
            FreeLibrary(m_Handle);
            m_Handle = nullptr;
        }
    }

    void* WindowsDynamicLibrary::getSymbol(const Core::String& symbolName) const {
        if (!m_Handle) return nullptr;
        return reinterpret_cast<void*>(GetProcAddress(m_Handle, symbolName.c_str()));
    }

    bool WindowsDynamicLibrary::isLoaded() const {
        return m_Handle != nullptr;
    }
}
#endif
