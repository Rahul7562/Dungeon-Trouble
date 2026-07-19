#pragma once
#include <Core/Types.h>
#include <Core/Result.h>
#include <Gameplay/Items/ItemDef.h>
#include <unordered_map>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

class ItemDefTable {
public:
    ItemDefTable() = default;

    // Load multiple definitions from a JSON string
    Core::Result<bool> LoadFromJson(const Core::String& jsonText);

    // Register a definition manually (useful for tests or procedural generation)
    void Register(const ItemDef& def);

    // Retrieve a definition by ID, returning nullptr if missing
    const ItemDef* Get(Core::u32 id) const;

private:
    std::unordered_map<Core::u32, ItemDef> m_items;
};

} // namespace Gameplay
} // namespace DungeonEngine
