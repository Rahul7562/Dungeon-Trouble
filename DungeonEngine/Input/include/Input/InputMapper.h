#pragma once
#include "Input/InputMapping.h"
#include "Input/IInputManager.h"
#include <unordered_map>
#include <vector>
#include <memory>

namespace DungeonEngine::Input {

    class InputMapper {
    public:
        explicit InputMapper(std::shared_ptr<IInputManager> inputManager);
        ~InputMapper() = default;

        // Context Management
        void registerContext(const InputContext& context);
        void pushContext(const InputContextId& contextId);
        void popContext();
        void clearContexts();

        // Runtime Rebinding
        void addBinding(const InputContextId& contextId, const InputBinding& binding);
        void removeBinding(const InputContextId& contextId, const InputActionId& actionId);
        void clearBindings(const InputContextId& contextId);

        // Action Evaluation
        bool isActionPressed(const InputActionId& actionId) const;
        bool isActionReleased(const InputActionId& actionId) const;
        bool isActionHeld(const InputActionId& actionId) const;

        // Returns analog value for axes, or 1.0f / 0.0f for buttons
        Core::f32 getActionValue(const InputActionId& actionId) const;

    private:
        std::shared_ptr<IInputManager> m_inputManager;
        std::unordered_map<InputContextId, InputContext> m_contexts;
        std::vector<InputContextId> m_activeContextStack;

        bool evaluateBindingState(const InputBinding& binding, InputState targetState) const;
    };

}
