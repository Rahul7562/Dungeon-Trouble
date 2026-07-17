#pragma once
#include "Core/Types.h"
#include <string>

namespace Core {
    class Engine;

    class Layer {
    public:
        Layer(const std::string& name = "Layer") : m_DebugName(name), m_Engine(nullptr) {}
        virtual ~Layer() = default;

        virtual void OnAttach() {}
        virtual void OnDetach() {}
        virtual void OnUpdate(float deltaTime) {}

        const std::string& GetName() const { return m_DebugName; }

        void SetEngine(Engine* engine) { m_Engine = engine; }

    protected:
        std::string m_DebugName;
        Engine* m_Engine;
    };
}
