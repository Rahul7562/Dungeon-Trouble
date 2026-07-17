# ADR 003: Configuration System

## Status
Accepted

## Context
DungeonTrouble requires a robust configuration system capable of handling various settings environments (engine, editor, game, user, runtime, build). The system must be thread-safe, avoid global mutable state, be extensible, and support typed configurations with default values, overrides, and validation.

We evaluated three approaches:
1.  **Monolithic Config Class:** A single large struct/class holding all configuration values.
    *   *Pros:* Simple to implement, fast.
    *   *Cons:* Scales poorly as the project grows, requires recompilation on config structure changes, difficult to isolate module-specific configs.
2.  **String-Based Key-Value Store (Existing System):** Using a map of strings to strings/ints, as currently seen in `Core::Config`.
    *   *Pros:* Highly dynamic, no compilation needed for new keys.
    *   *Cons:* Lacks strong typing, requires constant string hashing and parsing at runtime, no validation, error-prone due to typos.
3.  **Layered Provider Architecture with Cached Strongly-Typed Variables:** A system that separates the source of data (Providers) from parsing (Formatters) and provides strongly-typed, cached access objects (`ConfigVar`).
    *   *Pros:* High performance (cached access avoids string lookups), modular (easy to add new providers/formatters), supports complex hierarchies and overrides, type-safe.
    *   *Cons:* More complex to implement initially.

## Decision
We select the **Layered Provider Architecture with Cached Strongly-Typed Variables** (Approach 3).

### Configuration Philosophy
Configuration should be decoupled from the core logic. Systems should request typed values and be oblivious to where those values came from (file, command line, environment). Accessing configuration in a hot loop must be fast (ideally a direct memory read).

### Architecture & File Organization
The system will be placed in `DungeonEngine/Configuration/`. It consists of:
*   `ConfigValue`: A variant type representing the canonical typed value (Int, Float, String, Bool).
*   `IConfigProvider`: Interface for data sources (Files, CLI, Env, Memory).
*   `IConfigFormatter`: Interface for parsers (JSON, INI, TOML).
*   `ConfigurationManager`: Orchestrates providers, respects priority, and manages variables.
*   `ConfigVar<T>`: A strongly-typed handle caching the configuration value.

### Layering Strategy & Override Hierarchy
Providers will have a priority. When a key is requested, the manager queries providers in priority order (highest to lowest).
1.  **Command-Line Overrides** (Highest)
2.  **Environment Variables**
3.  **Runtime/Memory Overrides** (Profiles/Editor)
4.  **User Configuration Files**
5.  **Game/Engine Configuration Files**
6.  **Default Values** (Lowest, provided in code)

### Runtime Update Strategy
`ConfigVar` instances automatically register with the `ConfigurationManager`. When a value changes (via a file reload or runtime modification), the manager pushes updates to the cached values in the `ConfigVar` instances, enabling instant hot-reloading without polling.

### Validation Strategy
`ConfigVar` definitions will include validation logic (e.g., min/max bounds or custom predicates). When a new value is sourced, it must pass validation before updating the cache.

### Error Handling
Parsing errors or invalid values fall back gracefully to lower-priority providers or the default value. We will use `Core::Result` or similar mechanisms where appropriate, logging warnings instead of crashing, ensuring the engine remains robust.

### Future Expansion
The interface-based design allows seamless addition of new formats (YAML) and remote providers (Cloud sync, Multiplayer config) simply by implementing `IConfigFormatter` or `IConfigProvider` without modifying the core system.

## Consequences
*   **Positive:** Highly performant config access (zero-overhead after initialization). Clean separation of concerns. Easy to extend.
*   **Negative:** Increased initial complexity. Requires lightweight custom parsers for TOML/JSON/INI to avoid heavy third-party dependencies initially.
