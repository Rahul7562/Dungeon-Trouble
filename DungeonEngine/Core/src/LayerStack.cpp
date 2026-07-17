#include "Core/LayerStack.h"
#include <algorithm>

namespace Core {
    LayerStack::~LayerStack() {
        for (auto& layer : m_Layers) {
            layer->OnDetach();
        }
    }

    void LayerStack::PushLayer(std::shared_ptr<Layer> layer) {
        m_Layers.emplace_back(layer);
        layer->OnAttach();
    }

    void LayerStack::PopLayer(std::shared_ptr<Layer> layer) {
        auto it = std::find(m_Layers.begin(), m_Layers.end(), layer);
        if (it != m_Layers.end()) {
            layer->OnDetach();
            m_Layers.erase(it);
        }
    }
}
