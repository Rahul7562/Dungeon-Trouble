# ADR 006: Input System

## Status
Accepted

## Context
As part of Milestone 10, DungeonTrouble requires a platform-independent input framework supporting keyboard, mouse, and game controllers. The system must be extensible to future touch, pen, VR, and accessibility devices without breaking the public API. It also needs to support input mapping (action vs. raw input separation) and cleanly integrate with future event and window systems.

## Decision

### Input Abstraction Philosophy
The Input System abstracts away OS-specific and hardware-specific inputs into a unified polling and state management interface. The game logic will query the Input System for logical states (e.g., `InputAction::Jump` is active) rather than directly depending on physical hardware buttons (e.g., `KeyCode::Space` is pressed). This decoupling ensures cross-platform consistency and allows players to remap controls easily.

### Device Hierarchy
We will use an interface-based device hierarchy:
- `IInputDevice`: Base interface for all devices (`update()`, `isConnected()`, `getDeviceType()`).
- `IKeyboard`: Extends `IInputDevice` for keyboard-specific states (Key pressed, released, held, modifier keys, scancodes vs. keycodes).
- `IMouse`: Extends `IInputDevice` for mouse-specific states (Position, relative movement/delta, scroll wheel, buttons, cursor locking/visibility).
- `IGamepad`: Extends `IInputDevice` for controller-specific states (Analog sticks, triggers, buttons, connection status, vibration stub).

These interfaces will reside in the public Engine headers, while concrete implementations (e.g., `SimulatedKeyboard` for tests, and eventually `WindowsKeyboard` or `GLFWKeyboard`) will reside in internal `/src` directories or Platform-specific modules.

### Input State Management & Polling Strategy
The system will manage state using a classic current/previous frame pattern (e.g., tracking `currentState` and `previousState` for keys and buttons). This enables querying transitions:
- `Pressed`: True only on the frame the button was pressed.
- `Released`: True only on the frame the button was released.
- `Held`: True as long as the button is down.

Input polling will occur synchronously at the beginning of the engine frame. The `IInputManager` will iterate over all active devices, pulling state from the underlying platform layer, and updating the current vs. previous frame states.

### Action vs. Raw Input Separation
To support complex games, the system separates physical bindings from logical actions via an `InputMapper`.
- **InputBinding**: Connects a physical hardware event (e.g., `GamepadButton::A`) to an action.
- **InputAction**: The semantic meaning of an action (e.g., "Attack").
- **InputContext**: Groups related bindings. This allows swapping contexts (e.g., "UI Menu" vs. "Gameplay" vs. "Cutscene") quickly, enabling overlapping keys to perform different actions based on context.

### Future Event Integration
While this milestone implements synchronous polling, the architecture is designed to integrate cleanly with the upcoming Event & Messaging System (Milestone 13). The underlying platform can push asynchronous events to an internal queue, which the InputManager will drain and process during the next frame's update.

### Thread-Safety Considerations
Input state is updated on the main thread (or the thread handling window events) once per frame. Reading input state from game logic across threads (like ECS jobs) is thread-safe because the state is conceptually immutable and strictly double-buffered during the game logic update phase. The Input Manager handles the write-phase (updating states) before any job systems read from it.

## Consequences
- **Positive**: Game code relies entirely on `InputMapper` and logical actions, isolating it from hardware specifics.
- **Positive**: Support for multiple gamepads, context-based input swapping, and simple device mockability.
- **Negative**: Adds a layer of indirection compared to direct raw polling, but this is a standard and necessary tradeoff for a professional game engine.
