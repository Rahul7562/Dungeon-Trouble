# ADR 001: Diagnostics Framework

## Status
Accepted

## Context
A robust game engine requires a professional diagnostics system that is renderer-independent, platform-independent, and handles logging, assertions, profiling, and performance counters. The system must support future multithreading, editor integration, and remote logging, while maintaining low overhead as per our Engine Constitution.

## Decision
We have designed and implemented a modular diagnostics framework under `DungeonEngine/Diagnostics`.

### Architecture Choices:
1. **Logging**:
   - A `Logger` singleton-like manager (with thread-safety via `std::mutex`) managing multiple `LogSink` instances.
   - Initial sinks include `ConsoleSink` and `FileSink`.
   - Log levels include Trace, Debug, Info, Warning, Error, Critical, and Fatal.
   - Macros (e.g., `DT_LOG_INFO`) are provided for ease of use.
2. **Assertions**:
   - Designed to run without exceptions (`-fno-exceptions`).
   - `DT_ASSERT`, `DT_DEBUG_ASSERT`, and `DT_ENSURE` cover runtime, debug, and release-safe guarantees.
   - A pluggable assertion handler allows custom behavior (like opening crash reporters).
3. **Diagnostics Manager**:
   - Collects diagnostic events (Messages, Warnings, Errors) from various subsystems.
   - Events are mirrored to the logging system but also retained in a thread-safe list for runtime queries (useful for an in-engine console).
4. **Profiler Foundation**:
   - A lightweight `ScopedTimer` hooks into `Profiler` begin/end region APIs.
   - API is designed to easily wrap a third-party profiler like Tracy in the future.
5. **Performance Counters**:
   - Atomic variables track frame counts, average FPS, CPU time, and subsystem memory usage.

## Consequences
- **Positive**: Provides a unified, thread-safe, and modular foundation for debugging and profiling across all subsystems.
- **Negative**: Simple `std::mutex` locking in the logger might become a bottleneck under extremely heavy multi-threaded logging.
- **Mitigation**: Future milestones can upgrade to a fully lock-free asynchronous log queue if contention is detected.
