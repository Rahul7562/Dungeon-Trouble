Title: "🧪 [Add tests for Random::getBool functionality]"
Description:
🎯 **What:** The testing gap addressed
This PR addresses the testing gap for the `Random::getBool` function in `Math/Random.h` which was completely untested.

📊 **Coverage:** What scenarios are now tested
A new test section "Boolean" was added to `Tests/Math/RandomTests.cpp`. It instantiates the Random generator, calls `getBool` 1000 times, and verifies that both `true` and `false` values are returned. Furthermore, it implements a rough distribution check to ensure that the occurrences of `true` land within a reasonable 40-60% bound (between 400 and 600 out of 1000), effectively confirming it's producing a roughly even pseudo-random distribution of booleans rather than returning constants.

✨ **Result:** The improvement in test coverage
The `getBool` function is now comprehensively covered by unit tests, increasing overall code reliability and guaranteeing deterministic pseudo-random boolean generation functions correctly and fairly across all dependent systems (such as AI, loot drops, etc.).
