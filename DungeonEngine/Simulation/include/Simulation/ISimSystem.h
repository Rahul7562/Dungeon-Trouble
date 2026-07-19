#pragma once
#include "Simulation/SimContext.h"

namespace DungeonEngine {

class ISimSystem {
public:
    virtual ~ISimSystem() = default;

    virtual void Tick(SimContext& context) = 0;
    virtual const char* GetName() const = 0;
};

} // namespace DungeonEngine
