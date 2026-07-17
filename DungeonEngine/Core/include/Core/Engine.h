#pragma once
#include "Core/Types.h"
#include "Core/LayerStack.h"
#include "Core/FrameTimer.h"
#include "Core/ServiceLocator.h"

namespace Core {
    class Engine {
    public:
        Engine();
        virtual ~Engine();

        void Run();
        void Stop() { m_Running = false; }

        void PushLayer(std::shared_ptr<Layer> layer);

        ServiceLocator& GetServiceLocator() { return m_ServiceLocator; }

    private:
        bool m_Running;
        LayerStack m_LayerStack;
        FrameTimer m_Timer;
        ServiceLocator m_ServiceLocator;
    };
}
