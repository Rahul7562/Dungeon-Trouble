#include "Diagnostics/Assertion.h"
#include "Diagnostics/Log.h"
#include <cstdio>
#include <cstdlib>

namespace DungeonEngine {
namespace Diagnostics {

static void defaultAssertionHandler(const char* expression, const char* message, const char* file, int line) {
    if (message && message[0] != '\0') {
        DT_LOG_FATAL("Assert", "Assertion Failed: %s, Message: %s\nFile: %s\nLine: %d", expression, message, file, line);
        std::fprintf(stderr, "Assertion Failed: %s, Message: %s\nFile: %s\nLine: %d\n", expression, message, file, line);
    } else {
        DT_LOG_FATAL("Assert", "Assertion Failed: %s\nFile: %s\nLine: %d", expression, file, line);
        std::fprintf(stderr, "Assertion Failed: %s\nFile: %s\nLine: %d\n", expression, file, line);
    }
    std::abort();
}

static AssertionHandler s_handler = defaultAssertionHandler;

void Assertion::setHandler(AssertionHandler handler) {
    s_handler = handler ? handler : defaultAssertionHandler;
}

void Assertion::reportAssertion(const char* expression, const char* message, const char* file, int line) {
    if (s_handler) {
        s_handler(expression, message, file, line);
    }
}

} // namespace Diagnostics
} // namespace DungeonEngine
