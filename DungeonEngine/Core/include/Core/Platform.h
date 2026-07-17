#pragma once

// Operating System Detection
#if defined(_WIN32) || defined(_WIN64)
    #define DT_PLATFORM_WINDOWS
#elif defined(__APPLE__) || defined(__MACH__)
    #define DT_PLATFORM_APPLE
#elif defined(__linux__)
    #define DT_PLATFORM_LINUX
#else
    #error "Unknown platform!"
#endif

// Compiler Detection
#if defined(__clang__)
    #define DT_COMPILER_CLANG
#elif defined(__GNUC__) || defined(__GNUG__)
    #define DT_COMPILER_GCC
#elif defined(_MSC_VER)
    #define DT_COMPILER_MSVC
#else
    #error "Unknown compiler!"
#endif

// Architecture Detection
#if defined(__x86_64__) || defined(_M_X64)
    #define DT_ARCH_X64
#elif defined(__i386) || defined(_M_IX86)
    #define DT_ARCH_X86
#elif defined(__aarch64__) || defined(_M_ARM64)
    #define DT_ARCH_ARM64
#else
    #error "Unknown architecture!"
#endif
