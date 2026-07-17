# Documentation Guidelines

## 1. Engine Documentation
All overarching engine documentation resides in `DungeonDocs/`. Markdown format is mandatory.

## 2. API Documentation
Public APIs in header files must be documented using Doxygen-style comments.
```cpp
/**
 * @brief Initializes the subsystem.
 * @param config The configuration settings.
 * @return True if successful, false otherwise.
 */
bool initialize(const SystemConfig& config);
```

## 3. Architecture Decisions
Any significant structural change must be accompanied by an update to `ENGINE_ARCHITECTURE.md`.

## 4. Best Practices
* Be concise.
* Keep documentation up-to-date with code changes.
* Document the *why* alongside the *how*.
