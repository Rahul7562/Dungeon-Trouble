# Engine Constitution

## 1. Engineering Philosophy
DungeonTrouble is built on the belief that a game engine must be a robust, reusable, and highly modular foundation. It is not just a tool to build one game, but a professional-grade platform designed for long-term commercial-scale projects.

## 2. Core Principles
* **Performance First**: Aim for a minimum of 60 FPS, with 120 FPS preferred.
* **Low Overhead**: Strict management of memory and resources.
* **No Hardcoded Values**: Everything must be data-driven or configurable.
* **No Architectural Shortcuts**: Do it right the first time; avoid hacky fixes.
* **No Duplicate Systems**: Subsystems must be highly modular, replaceable, and communicate via clean interfaces.

## 3. Long-Term Vision
The engine will support a 2.5D Isometric Action MMORPG, but its core architecture will remain agnostic to game logic, allowing future titles to leverage the same technology without extensive refactoring.

## 4. Architecture Philosophy
* **SOLID Principles**: Strongly adhere to Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.
* **Composition over Inheritance**: Prefer building complex behaviors through composed components rather than deep inheritance hierarchies.
* **Data-Oriented Design**: Apply DOD where appropriate to maximize cache coherency and CPU throughput.

## 5. Engine Modularity
Subsystems must be isolated and communicate through well-defined interfaces. A subsystem should be replaceable without cascading changes to other systems.

## 6. Scalability, Maintainability, Readability, and Simplicity
Code must be written with the assumption that it will be read ten times more than it is written. Keep implementations simple, maintainable, and scalable.

## 7. Professional Engineering Expectations
All engineers are expected to follow the coding standards strictly, participate in rigorous code reviews, and maintain comprehensive documentation.

## 8. Separation of Engine and Game Logic
The engine must never know about DungeonTrouble-specific concepts (e.g., specific spells, classes, or quests). The game logic sits entirely on top of the engine API.

## 9. Long-Term Compatibility & Breaking-Change Policy
Breaking changes to the public engine API require a formal proposal and a deprecation phase. Backward compatibility is a priority for existing engine modules.

## 10. Technical Debt Policy
Technical debt must be documented as soon as it is incurred and scheduled for resolution within the next two milestones.

## 11. AI Development Rules
AI-generated code must be subjected to the same rigorous review and testing as human-written code. No "black-box" AI solutions without full understanding.

## 12. Code Review Expectations & Design-First Philosophy
Every feature requires a design doc or design discussion before implementation. Code reviews must ensure architectural compliance and optimal performance.

## 13. Documentation Requirements
All public APIs must be documented. Architecture decisions must be recorded in the Engine Constitution or Architecture documentation.
