#pragma once
#include <Simulation/ISimSystem.h>
#include <ECS/Registry.h>
#include <Events/EventBus.h>
#include <Gameplay/Loot/LootTableDefTable.h>
#include <Gameplay/Items/Inventory.h>
#include <Gameplay/Items/ItemDefTable.h>
#include <Core/Result.h>
#include <vector>

namespace DungeonEngine {
namespace Gameplay {

class LootSystem : public ISimSystem {
public:
    LootSystem(ECS::Registry* registry, EventBus* eventBus, const LootTableDefTable* lootTableDefTable);
    ~LootSystem() override;

    void Tick(SimContext& context) override;
    const char* GetName() const override { return "LootSystem"; }

    Core::Result<bool> PickUp(ECS::Entity lootEntity, Inventory& into, const ItemDefTable& itemDefTable);

private:
    ECS::Registry* m_registry;
    EventBus* m_eventBus;
    const LootTableDefTable* m_lootTableDefTable;
    SubscriptionHandle m_deathSubscription;
    std::vector<ECS::Entity> m_deadEntities;
};

} // namespace Gameplay
} // namespace DungeonEngine
