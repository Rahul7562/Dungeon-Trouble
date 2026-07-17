# Refactoring Policy

## 1. When Refactoring is Allowed
* During active feature development to improve local code quality.
* When technical debt is explicitly scheduled to be paid down.
* When profiling identifies a clear bottleneck requiring structural change.

## 2. When Refactoring is Forbidden
* Immediately prior to a major release (code freeze).
* "Refactoring for the sake of refactoring" without a measurable benefit.

## 3. Backward Compatibility & APIs
If refactoring a core engine API used by many systems, provide a deprecated wrapper for at least one minor release cycle.

## 4. Migration Documentation
Significant refactors require a document explaining what changed, why, and how to update dependent code.
