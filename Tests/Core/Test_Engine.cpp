#include "../../ThirdParty/catch2/catch_amalgamated.hpp"
#include "Core/Engine.h"
#include "Core/Layer.h"
#include <memory>

class TestLayer : public Core::Layer {
public:
    int updates = 0;
    Core::Engine* engine;

    TestLayer(Core::Engine* e) : engine(e) {}

    void OnUpdate(float deltaTime) override {
        updates++;
        if (updates >= 5) {
            engine->Stop();
        }
    }
};

TEST_CASE("Engine runs and stops") {
    Core::Engine engine;
    auto layer = std::make_shared<TestLayer>(&engine);
    engine.PushLayer(layer);

    engine.Run();

    REQUIRE(layer->updates == 5);
}
