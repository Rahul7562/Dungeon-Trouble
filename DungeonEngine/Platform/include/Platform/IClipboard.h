#pragma once
#include "Core/Types.h"
#include <optional>

namespace DungeonEngine::Platform {

    class IClipboard {
    public:
        virtual ~IClipboard() = default;

        virtual std::optional<Core::String> getText() const = 0;
        virtual bool setText(const Core::String& text) = 0;
    };

}
