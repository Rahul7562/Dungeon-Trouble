# Definition of Done

No milestone is complete until every item on this checklist is satisfied.

## Release Checklist
- [ ] **Build Success**: Compiles successfully on all target platforms (CMake, C++17, `-fno-exceptions`).
- [ ] **Compiler Warnings**: Zero compiler warnings.
- [ ] **Linker Warnings**: Zero linker warnings.
- [ ] **Unit Tests**: All Catch2 unit tests pass. New code has >80% coverage.
- [ ] **Integration Tests**: System-level integration tests pass.
- [ ] **Documentation**: Public APIs are documented. Architectural changes are updated in `DungeonDocs/`.
- [ ] **Architecture Compliance**: Adheres to SOLID, Composition over Inheritance, and modularity principles. No duplicate systems.
- [ ] **Performance Review**: Meets minimum 60 FPS (120 FPS preferred) and memory targets. Profiling confirms no major regressions.
- [ ] **Dependency Review**: No unauthorized third-party libraries introduced.
- [ ] **Public APIs**: Clean, minimal, and correctly const-qualified.
- [ ] **Folder Organization**: Files are correctly placed in `include/` and `src/`.
- [ ] **Naming Conventions**: Strictly follows `CODING_STANDARDS.md`.
- [ ] **Duplicate Code Detection**: No redundant logic.
- [ ] **Regression Testing**: Existing features remain fully functional.
- [ ] **Code Review**: Approved by at least one peer/Lead Engineer.
- [ ] **Self-Review**: Developer has reviewed their own diff thoroughly.
- [ ] **Technical Debt**: Any deferred work is ticketed and documented.
- [ ] **Known Limitations**: Documented in the PR and codebase.
- [ ] **Release Notes**: Milestone changes are summarized.
- [ ] **Final Approval**: Technical Director sign-off.
