# Versioning Policy

## 1. Semantic Versioning
The engine follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
* **MAJOR**: Breaking API changes.
* **MINOR**: New features, backwards-compatible.
* **PATCH**: Bug fixes, backwards-compatible.

## 2. Branch Strategy
* `main`: Stable, releasable state.
* `develop`: Integration branch for next release.
* `feature/*`: Active development branches.

## 3. Release Workflow
Releases are tagged on `main`. A changelog must be generated from PRs merged since the last release.

## 4. Hotfix Workflow
Critical bugs in production are fixed in a `hotfix/*` branch off `main`, merged into `main` and immediately cherry-picked into `develop`.

## 5. Migration Policy
When deprecating APIs, provide clear migration guides in the release notes.
