#include "catch_amalgamated.hpp"
#include "Input/InputTypes.h"
#include "Input/InputMapping.h"
#include "Input/IInputManager.h"
#include "Input/InputMapper.h"
#include "../../DungeonEngine/Input/src/SimulatedDevices.h"

using namespace DungeonEngine;
using namespace DungeonEngine::Input;

TEST_CASE("Simulated Keyboard State Transitions", "[Input]") {
    auto keyboard = std::make_shared<SimulatedKeyboard>();

    // Initial state
    REQUIRE(keyboard->isKeyPressed(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyHeld(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyReleased(KeyCode::SPACE) == false);

    // Frame 1: Key Pressed
    keyboard->simulateKeyDown(KeyCode::SPACE);
    // Note: Simulated devices don't automatically update from simulateKeyDown,
    // the manager handles the state flip on update() call. Wait, for simulate to work,
    // we set the current state immediately so we don't need to call update() for current state.
    // However, to trigger "Pressed" which needs !previous && current, we might need update to run or not run based on how we wrote it.
    // Our implementation:
    // isKeyPressed: current && !previous.
    // currently m_currentFrameKeys is set, m_previousFrameKeys is empty.

    REQUIRE(keyboard->isKeyPressed(KeyCode::SPACE) == true);
    REQUIRE(keyboard->isKeyHeld(KeyCode::SPACE) == true);
    REQUIRE(keyboard->isKeyReleased(KeyCode::SPACE) == false);

    // Frame 2: Key Held
    keyboard->update(); // previous <- current
    REQUIRE(keyboard->isKeyPressed(KeyCode::SPACE) == false); // no longer just pressed
    REQUIRE(keyboard->isKeyHeld(KeyCode::SPACE) == true);
    REQUIRE(keyboard->isKeyReleased(KeyCode::SPACE) == false);

    // Frame 3: Key Released
    keyboard->simulateKeyUp(KeyCode::SPACE);
    REQUIRE(keyboard->isKeyPressed(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyHeld(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyReleased(KeyCode::SPACE) == true); // current = false, previous = true

    // Frame 4: None
    keyboard->update(); // previous <- current
    REQUIRE(keyboard->isKeyPressed(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyHeld(KeyCode::SPACE) == false);
    REQUIRE(keyboard->isKeyReleased(KeyCode::SPACE) == false);
}

TEST_CASE("Simulated Gamepad Axis with Deadzone", "[Input]") {
    auto gamepad = std::make_shared<SimulatedGamepad>();
    gamepad->setDeadZone(GamepadAxis::LEFT_X, 0.2f);

    // Inside deadzone
    gamepad->simulateAxisMove(GamepadAxis::LEFT_X, 0.1f);
    REQUIRE(gamepad->getAxisValue(GamepadAxis::LEFT_X) == Catch::Approx(0.0f));

    // Negative inside deadzone
    gamepad->simulateAxisMove(GamepadAxis::LEFT_X, -0.1f);
    REQUIRE(gamepad->getAxisValue(GamepadAxis::LEFT_X) == Catch::Approx(0.0f));

    // Outside deadzone
    gamepad->simulateAxisMove(GamepadAxis::LEFT_X, 0.6f);
    REQUIRE(gamepad->getAxisValue(GamepadAxis::LEFT_X) == Catch::Approx(0.5f)); // (0.6 - 0.2) / 0.8 = 0.5

    // Negative outside deadzone
    gamepad->simulateAxisMove(GamepadAxis::LEFT_X, -0.6f);
    REQUIRE(gamepad->getAxisValue(GamepadAxis::LEFT_X) == Catch::Approx(-0.5f)); // (-0.6 + 0.2) / 0.8 = -0.5
}

#include "../../DungeonEngine/Input/src/InputManager.h" // We need the concrete implementation

TEST_CASE("Input Mapping and Contexts", "[Input]") {
    auto manager = std::make_shared<InputManager>();
    auto keyboard = std::make_shared<SimulatedKeyboard>();
    auto mouse = std::make_shared<SimulatedMouse>();
    manager->registerDevice(keyboard);
    manager->registerDevice(mouse);

    InputMapper mapper(manager);

    // Create contexts
    InputContext gameplayCtx{"Gameplay"};
    InputBinding jumpBinding{"Jump"};
    jumpBinding.physicalInput = KeyCode::SPACE;
    gameplayCtx.bindings.push_back(jumpBinding);

    InputBinding attackBinding{"Attack"};
    attackBinding.physicalInput = MouseButton::LEFT;
    gameplayCtx.bindings.push_back(attackBinding);

    InputContext uiCtx{"UI"};
    InputBinding confirmBinding{"Confirm"};
    confirmBinding.physicalInput = KeyCode::SPACE;
    uiCtx.bindings.push_back(confirmBinding);

    mapper.registerContext(gameplayCtx);
    mapper.registerContext(uiCtx);

    // Push Gameplay
    mapper.pushContext("Gameplay");

    // Simulate jump
    keyboard->simulateKeyDown(KeyCode::SPACE);
    REQUIRE(mapper.isActionPressed("Jump") == true);
    REQUIRE(mapper.isActionPressed("Confirm") == false); // Not in active context
    REQUIRE(mapper.isActionPressed("Attack") == false);

    // Simulate attack
    mouse->simulateButtonDown(MouseButton::LEFT);
    REQUIRE(mapper.isActionPressed("Attack") == true);

    // Push UI context over Gameplay
    mapper.pushContext("UI");

    // Now space should trigger Confirm, but Jump will ALSO trigger because Gameplay is still on stack!
    // Often UI context might want to block Gameplay. For this iteration, evaluating from top down
    // means BOTH might fire if we don't "consume" inputs. Our current implementation doesn't consume inputs,
    // so both will evaluate to true as they are both active on the stack.
    REQUIRE(mapper.isActionPressed("Confirm") == true);
    REQUIRE(mapper.isActionPressed("Jump") == true);
}

TEST_CASE("Input Modifier Requirement", "[Input]") {
    auto manager = std::make_shared<InputManager>();
    auto keyboard = std::make_shared<SimulatedKeyboard>();
    manager->registerDevice(keyboard);

    InputMapper mapper(manager);

    InputContext gameplayCtx{"Gameplay"};
    InputBinding sprintBinding{"Sprint"};
    sprintBinding.physicalInput = KeyCode::W;
    sprintBinding.requiredModifiers = KeyModifier::SHIFT;
    gameplayCtx.bindings.push_back(sprintBinding);

    mapper.registerContext(gameplayCtx);
    mapper.pushContext("Gameplay");

    // Press W without shift
    keyboard->simulateKeyDown(KeyCode::W);
    REQUIRE(mapper.isActionHeld("Sprint") == false);

    // Hold shift
    keyboard->setModifiers(KeyModifier::SHIFT);
    REQUIRE(mapper.isActionHeld("Sprint") == true);
}
