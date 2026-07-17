# Coding Standards

We enforce these standards project-wide to ensure readability, maintainability, and scalability.

## Naming Conventions
- **Classes/Structs:** PascalCase (e.g., `RenderManager`).
- **Functions:** PascalCase (e.g., `LoadTexture()`).
- **Variables:** camelCase (e.g., `playerHealth`).
- **Member Variables:** Prefix with `m_` (e.g., `m_playerHealth`).
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_PLAYERS`).

## Folder Conventions
- Code is grouped by subsystem module. Each module has an `include/` and `src/` separation if acting as a library.

## Header Organization
- Headers must use `#pragma once`.
- Include order: Local header, Engine headers, External headers, Standard library.

## Documentation Style and Comment Policy
- Use Doxygen style `///` for public APIs.
- Comments must explain *why* the code does what it does, not *what* it does. Avoid redundant comments.

## Class Organization
- Order: Public methods, public variables, protected methods, private methods, private variables.

## Error Handling
- Exceptions are disabled (`-fno-exceptions`).
- Use custom `Result<T, E>` types for recoverable errors.

## Logging
- Use custom macros (`LOG_INFO`, `LOG_ERROR`). Do not use `std::cout`.

## Assertions
- Use `ASSERT()` aggressively to enforce invariants. Asserts compile out in Release.

## Testing Philosophy
- Write unit tests for all math, serialization, and logic functions.
- Test-Driven Development (TDD) is encouraged for utility code.

## Dependency Rules
- High-level systems can include low-level systems. Never the reverse.
- The Engine must NEVER depend on the Client or Editor.

## Versioning Strategy
- Semantic Versioning: `MAJOR.MINOR.PATCH`.

## Git Branching Strategy
- `main` is stable. `develop` is for active integration.
- Feature branches: `feature/name-of-feature`.
- Fix branches: `fix/name-of-fix`.
