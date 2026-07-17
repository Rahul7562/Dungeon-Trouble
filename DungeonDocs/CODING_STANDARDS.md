# Coding Standards

## 1. Folder & File Organization
* Source files in `DungeonEngine/src/`, Headers in `DungeonEngine/include/`.
* Tests in `Tests/`.
* File naming: PascalCase for classes (e.g., `RenderSystem.cpp`), lower_snake_case for utilities or standard-like files.

## 2. Namespaces & Naming Conventions
* **Namespaces**: Use `DungeonEngine` as the root namespace.
* **Classes**: `PascalCase` (e.g., `Entity`, `SystemManager`).
* **Functions**: `camelCase` (e.g., `updateTransform`, `initializeSystem`).
* **Variables**: `camelCase` for locals, `m_camelCase` for members, `s_camelCase` for statics.
* **Enums**: `PascalCase` for enum classes, `UPPER_SNAKE_CASE` for enumerators.

## 3. Template Guidelines
Keep templates minimal to reduce compilation time and executable bloat. Isolate template implementations in `.inl` files if they become large.

## 4. Header & Source Organization
* Include guards: `#pragma once`.
* Include ordering: Local headers, Engine headers, Third-party headers, Standard library headers.
* Use forward declarations whenever possible to reduce compilation dependencies.

## 5. Memory & Performance
* **Memory Ownership**: Prefer `std::unique_ptr` for exclusive ownership and raw pointers for non-owning references. Avoid `std::shared_ptr` unless absolutely necessary.
* **Const Correctness**: Use `const` aggressively for variables, pointers, and member functions.
* **Move Semantics**: Utilize `std::move` to avoid unnecessary copies.

## 6. Error Handling
* **Exceptions**: Exceptions are disabled (`-fno-exceptions`). Do not use `try`, `catch`, or `throw`.
* **Assertions**: Use custom engine asserts for invariant checking in debug builds.
* **Return Values**: Use `std::optional` or custom `Result` types for error handling.

## 7. Comments & Documentation
* Use Doxygen-style comments for public APIs.
* Explain *why*, not *what*, in implementation comments.

## 8. Formatting & STL Usage
* Follow the provided `.clang-format`.
* STL Usage: Permitted, but be mindful of allocations. Prefer fixed-size arrays or custom allocators in hot paths.
* `constexpr` usage: Maximally utilize `constexpr` for compile-time evaluation.

## 9. Modern C++ Best Practices
* Target C++17.
* Avoid global mutable state.
* Avoid `<iostream>` (prefer `cstdio` like `printf`/`fprintf` for logging).
