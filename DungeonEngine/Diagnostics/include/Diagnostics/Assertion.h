#pragma once

#include <string_view>

namespace DungeonEngine {
namespace Diagnostics {

using AssertionHandler = void(*)(const char* expression, const char* message, const char* file, int line);

class Assertion {
public:
    static void setHandler(AssertionHandler handler);
    static void reportAssertion(const char* expression, const char* message, const char* file, int line);
};

} // namespace Diagnostics
} // namespace DungeonEngine

// Runtime Assertion - Always Evaluated
#define DT_ASSERT_MSG(expr, msg) \
    if (!(expr)) { \
        DungeonEngine::Diagnostics::Assertion::reportAssertion(#expr, msg, __FILE__, __LINE__); \
    }

#define DT_ASSERT_EX(expr) DT_ASSERT_MSG(expr, "")

// Debug Assertion - Evaluated only in debug builds
#ifdef NDEBUG
    #define DT_DEBUG_ASSERT(expr, msg) ((void)0)
#else
    #define DT_DEBUG_ASSERT(expr, msg) DT_ASSERT_MSG(expr, msg)
#endif

// Ensure - Always evaluated, returns value in release, asserts in debug
#ifdef NDEBUG
    #define DT_ENSURE(expr) (expr)
#else
    #define DT_ENSURE(expr) \
        ([&]() { \
            auto res = (expr); \
            if (!(res)) { DungeonEngine::Diagnostics::Assertion::reportAssertion(#expr, "Ensure failed", __FILE__, __LINE__); } \
            return res; \
        }())
#endif
