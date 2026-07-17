#pragma once

#include "Core/Result.h"

namespace Configuration {

    // Helper to represent a success state when no value is needed
    struct EmptySuccess {};

    // Result alias for void returns
    using VoidResult = Core::Result<EmptySuccess>;

    inline VoidResult MakeSuccess() {
        return VoidResult(EmptySuccess{});
    }
}
