#pragma once

#include "Core/Types.h"
#include "Core/Result.h"
#include "World/ZoneDef.h"

namespace DungeonEngine::World {

    class ZoneLoader {
    public:
        /**
         * Parses a ZoneDef from text.
         * Format:
         * line 1: `zone <id> <name>`
         * line 2: `size <width> <height>`
         * line 3: `tilesize <f32> <originX> <originY>`
         * then exactly <height> map rows of <width> chars from legend `. = Floor, # = Wall, _ = Empty, P = Pit, W = Water, L = Lava`
         * then zero+ lines `spawn <id> <kind:player|enemy|boss|chest> <tileX> <tileY> <refId>` (spawn world position = tile center).
         *
         * Returns an Error mentioning the line number if malformed.
         */
        static Core::Result<ZoneDef> LoadFromText(const Core::String& text);
    };

} // namespace DungeonEngine::World
