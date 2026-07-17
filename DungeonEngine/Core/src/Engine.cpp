#include "Core/Engine.h"

namespace Core {
    Engine::Engine() : m_Running(true) {}

    Engine::~Engine() {
        m_ServiceLocator.Clear();
    }

    void Engine::PushLayer(std::shared_ptr<Layer> layer) {
        layer->SetEngine(this);
        m_LayerStack.PushLayer(layer);
    }

    void Engine::Run() {
        m_ServiceLocator.InitAll();

        while (m_Running) {
            m_Timer.Tick();
            float deltaTime = m_Timer.GetDeltaTime();

            m_ServiceLocator.UpdateAll(deltaTime);

            for (auto& layer : m_LayerStack) {
                layer->OnUpdate(deltaTime);
            }
        }
    }
}
