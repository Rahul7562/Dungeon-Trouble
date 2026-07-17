#pragma once
#include <cstdio>
#include <cstdlib>

#ifdef NDEBUG
    #define DT_ASSERT(condition, message) ((void)0)
#else
    #define DT_ASSERT(condition, message) \
        if (!(condition)) { \
            std::fprintf(stderr, "Assertion Failed: %s\nFile: %s\nLine: %d\n", message, __FILE__, __LINE__); \
            std::abort(); \
        }
#endif
