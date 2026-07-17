#pragma once
#include "Core/Engine.h"
#include <memory>

namespace Core {
    class Application {
    public:
        Application();
        virtual ~Application();

        void Start();
        Engine& GetEngine() { return *m_Engine; }

    private:
        std::unique_ptr<Engine> m_Engine;
    };

    // To be defined by the client
    Application* CreateApplication();
}
