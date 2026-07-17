#include "Core/Application.h"

namespace Core {
    Application::Application() {
        m_Engine = std::make_unique<Engine>();
    }

    Application::~Application() = default;

    void Application::Start() {
        m_Engine->Run();
    }
}
