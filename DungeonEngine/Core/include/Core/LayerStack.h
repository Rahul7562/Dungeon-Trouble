#pragma once
#include "Core/Layer.h"
#include <vector>
#include <memory>

namespace Core {
    class LayerStack {
    public:
        LayerStack() = default;
        ~LayerStack();

        void PushLayer(std::shared_ptr<Layer> layer);
        void PopLayer(std::shared_ptr<Layer> layer);

        auto begin() { return m_Layers.begin(); }
        auto end() { return m_Layers.end(); }

    private:
        std::vector<std::shared_ptr<Layer>> m_Layers;
    };
}
