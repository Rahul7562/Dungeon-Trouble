# Development Workflow

Every milestone must follow this precise workflow to ensure AAA studio quality.

## 1. Read Documentation
Review the project constitution, relevant design docs, and architectural guidelines before starting.

## 2. Understand Milestone
Ensure a complete grasp of the feature requirements, constraints, and success criteria.

## 3. Analyze Architecture
Determine how the new feature fits into the existing architecture. Avoid shortcuts.

## 4. Explain Design Decisions
Draft a brief technical design document or issue comment outlining the proposed approach.

## 5. Identify Dependencies
List all internal and external dependencies required for the milestone.

## 6. Implement
Write clean, performant, and standards-compliant code. Follow test-driven development where applicable.

## 7. Test
Write unit tests using Catch2. Ensure all edge cases are covered.

## 8. Review
Submit a Pull Request. Code must be reviewed for architecture compliance, performance, and style.

## 9. Refactor
Address all PR feedback. Refactor code if the initial implementation is subpar.

## 10. Verify
Ensure tests pass, no compiler/linker warnings exist, and the Definition of Done is fully met.

## 11. Document
Update `ENGINE_ARCHITECTURE.md`, `ROADMAP.md`, or relevant API docs.

## 12. Stop
Do not scope creep. Once the milestone is done, mark it complete and move to the next.
