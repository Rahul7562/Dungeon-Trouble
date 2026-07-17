# Self Review - Milestone 2

## Weaknesses Identified
- `ServiceLocator` uses `std::type_index` with RTTI (`typeid`). RTTI can be slow and is sometimes disabled in strict console environments.
- `ServiceLocator` mapping forces resolution to concrete implementations rather than interfaces. The registration method `RegisterService<T>` binds the specific type, making it impossible to register an `AudioImpl` but fetch it via `IAudio`.
- `LayerStack` currently allocates layers as `std::shared_ptr`.
- `Engine` loop is single-threaded and locks the application lifecycle.

## Refactoring Suggestions (For Future Milestones)
- **Interface Mapping:** Update `ServiceLocator` to accept `template<typename Interface, typename Impl = Interface> void RegisterService()`.
- **RTTI Removal:** Replace `typeid(T)` in `ServiceLocator` with a custom static type ID generator (e.g., a static template method that increments a global counter) to eliminate the RTTI requirement.
- **Memory Allocator:** Replace `std::make_shared` and `std::vector` allocations in `LayerStack` and `ServiceLocator` with a custom memory pool/allocator.
- **Job System:** Decouple the `Engine::Run()` loop from `while(m_Running)` into independent job ticks that can be dispatched across worker threads.

*Conclusion: The current implementation establishes the required foundational C++ framework and lifecycle management correctly for Milestone 2. Known flaws in the Service Locator design should be addressed before integrating the Renderer module in Milestone 3.*
