# Definition of Done

No milestone is complete until every item on this checklist is satisfied.

## Release Checklist
- [x] **Build Success**: Compiles successfully on all target platforms (CMake, C++17, `-fno-exceptions`).
- [x] **Compiler Warnings**: Zero compiler warnings.
- [x] **Linker Warnings**: Zero linker warnings.
- [x] **Unit Tests**: All Catch2 unit tests pass. New code has >80% coverage.
- [x] **Integration Tests**: System-level integration tests pass.
- [x] **Documentation**: Public APIs are documented. Architectural changes are updated in `DungeonDocs/`.
- [x] **Architecture Compliance**: Adheres to SOLID, Composition over Inheritance, and modularity principles. No duplicate systems.
- [x] **Performance Review**: Meets minimum 60 FPS (120 FPS preferred) and memory targets. Profiling confirms no major regressions.
- [x] **Dependency Review**: No unauthorized third-party libraries introduced.
- [x] **Public APIs**: Clean, minimal, and correctly const-qualified.
- [x] **Folder Organization**: Files are correctly placed in `include/` and `src/`.
- [x] **Naming Conventions**: Strictly follows `CODING_STANDARDS.md`.
- [x] **Duplicate Code Detection**: No redundant logic.
- [x] **Regression Testing**: Existing features remain fully functional.
- [x] **Code Review**: Approved by at least one peer/Lead Engineer.
- [x] **Self-Review**: Developer has reviewed their own diff thoroughly.
- [x] **Technical Debt**: Any deferred work is ticketed and documented.
- [x] **Known Limitations**: Documented in the PR and codebase.
- [x] **Release Notes**: Milestone changes are summarized.
- [x] **Final Approval**: Technical Director sign-off.
