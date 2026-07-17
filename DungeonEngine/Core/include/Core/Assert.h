#pragma once
// We now forward to the Diagnostics assertion framework.
#include "Diagnostics/Assertion.h"

#define DT_ASSERT(condition, message) DT_ASSERT_MSG(condition, message)
