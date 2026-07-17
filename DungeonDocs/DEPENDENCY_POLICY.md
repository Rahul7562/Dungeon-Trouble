# Dependency Policy

## 1. Allowed Dependencies
Third-party libraries must be carefully scrutinized. Only high-quality, widely-used, and permissive-licensed (MIT, zlib, BSD) libraries are allowed. (e.g., SDL, GLFW, Catch2).

## 2. Third-Party Library Policy
* Never expose third-party headers in public engine headers. Always wrap them in the `src/` directory.
* No game engines allowed (e.g., Unity, Unreal, Godot).

## 3. Dependency Approval Process
Adding a new dependency requires Technical Director approval and must be documented in `ENGINE_CONSTITUTION.md` or the `README.md`.

## 4. Module Dependency Direction
High-level modules depend on low-level modules. Low-level modules must never depend on high-level modules (Dependency Inversion).

## 5. Forbidden Patterns
* Circular dependencies between modules.
* Over-reliance on heavy frameworks (e.g., Boost) when standard library or simple custom solutions suffice.
