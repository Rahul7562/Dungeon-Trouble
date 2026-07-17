#include "catch_amalgamated.hpp"
#include "Window/WindowManager.h"
#include "Window/WindowProperties.h"

using namespace DungeonEngine::Window;


TEST_CASE("WindowManager basic lifecycle", "[Window]") {
    WindowManager manager;

    REQUIRE(manager.getAllWindows().empty());
    REQUIRE(manager.getMainWindow() == nullptr);
    REQUIRE(manager.getWindow(1) == nullptr);

    WindowProperties props;
    props.title = "Test Window";
    props.width = 800;
    props.height = 600;

    IWindow* window = manager.createWindow(props);
    REQUIRE(window != nullptr);
    REQUIRE(manager.getAllWindows().size() == 1);

    // First window should be the main window
    REQUIRE(manager.getMainWindow() == window);
    REQUIRE(manager.getWindow(window->getId()) == window);

    // Verify properties
    const auto& currentProps = window->getProperties();
    REQUIRE(currentProps.title == "Test Window");
    REQUIRE(currentProps.width == 800);
    REQUIRE(currentProps.height == 600);

    // Destroy
    manager.destroyWindow(window->getId());
    REQUIRE(manager.getAllWindows().empty());
    REQUIRE(manager.getMainWindow() == nullptr);
}

TEST_CASE("WindowManager multi-window support", "[Window]") {
    WindowManager manager;

    WindowProperties props1;
    props1.title = "Window 1";
    IWindow* w1 = manager.createWindow(props1);

    WindowProperties props2;
    props2.title = "Window 2";
    IWindow* w2 = manager.createWindow(props2);

    REQUIRE(manager.getAllWindows().size() == 2);
    REQUIRE(manager.getMainWindow() == w1);

    // Destroy w1, w2 should become main window (or we can handle it differently, but fallback to another is good)
    manager.destroyWindow(w1->getId());
    REQUIRE(manager.getAllWindows().size() == 1);
    REQUIRE(manager.getMainWindow() == w2);

    manager.destroyWindow(w2->getId());
    REQUIRE(manager.getAllWindows().empty());
}

TEST_CASE("Window property updates", "[Window]") {
    WindowManager manager;
    WindowProperties props;
    IWindow* window = manager.createWindow(props);

    window->resize(1024, 768);
    REQUIRE(window->getProperties().width == 1024);
    REQUIRE(window->getProperties().height == 768);

    window->move(100, 200);
    REQUIRE(window->getProperties().positionX == 100);
    REQUIRE(window->getProperties().positionY == 200);

    window->hide();
    REQUIRE(window->getProperties().visible == false);

    window->show();
    REQUIRE(window->getProperties().visible == true);
}

TEST_CASE("Display enumeration", "[Window]") {
    WindowManager manager;

    auto monitors = manager.getConnectedMonitors();
    REQUIRE(!monitors.empty());

    auto primary = manager.getPrimaryMonitor();
    REQUIRE(primary.isPrimary == true);
    // Based on our dummy backend:
    REQUIRE(primary.id == 1);
}

TEST_CASE("Window events callback", "[Window]") {
    WindowManager manager;
    IWindow* window = manager.createWindow(WindowProperties{});

    bool wasClosed = false;
    window->setEventCallback([&](const WindowEvent& e) {
        if (e.type == WindowEventType::Closed) {
            wasClosed = true;
        }
    });

    window->close();
    REQUIRE(wasClosed == true);
}
