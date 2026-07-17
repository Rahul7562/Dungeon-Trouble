# Testing Guidelines

## 1. Unit Testing Strategy
* We use **Catch2** for unit testing.
* Every isolated subsystem (Math, Memory, String) must have near 100% test coverage.
* Tests reside in the `Tests/` directory.

## 2. Integration Testing
Test interactions between subsystems (e.g., Scene + ECS + Renderer). These tests ensure that modules communicate correctly.

## 3. Regression Testing
When a bug is fixed, a test MUST be written to reproduce the bug to prevent it from returning.

## 4. Performance Testing
Critical paths (ECS iteration, memory allocation) must have benchmarking tests to ensure updates do not degrade performance.

## 5. Stress Testing & Server Testing
The networking and server modules must be tested under high synthetic load (e.g., 10,000 simulated client connections) to verify stability and memory usage.

## 6. Memory Testing
Run tests periodically with AddressSanitizer (ASan) and MemorySanitizer (MSan) to detect leaks and invalid accesses.
