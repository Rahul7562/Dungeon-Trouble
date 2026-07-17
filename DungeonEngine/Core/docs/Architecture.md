# Core Architecture

The Core is built to support the high-level architecture mapped out in Milestone 1.

## Modularity & Subsystems
We utilize a `ServiceLocator` combined with virtual `IModule` interfaces. This solves the classic singleton problem (hidden dependencies, tight coupling, impossible to mock) by allowing the application entry point to inject the required services on startup.

## Types & Constants
We utilize strong `typedef`s (`u8`, `i32`, `f32`) to ensure byte-sizes are exact across all compiled targets. A custom `Result<T, E>` prevents standard exception overhead (`-fno-exceptions`).

## Application Loop
The `Application` class wraps the `Engine` to keep OS logic separate from gameplay loops.
The `Engine` manages a `LayerStack`. Layers run in a deterministic order, allowing UI to consume events before gameplay logic receives them.
