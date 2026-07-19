#include <Gameplay/Loot/LootSystem.h>
#include <Gameplay/Combat/Events.h>
#include <Gameplay/Loot/LootComponents.h>
#include <Gameplay/Loot/LootRoller.h>
#include <Gameplay/Loot/Events.h>
#include <Simulation/SimRandom.h>
#include <Gameplay/Items/ItemStack.h>

namespace DungeonEngine {
namespace Gameplay {

LootSystem::LootSystem(ECS::Registry* registry, EventBus* eventBus, const LootTableDefTable* lootTableDefTable)
    : m_registry(registry), m_eventBus(eventBus), m_lootTableDefTable(lootTableDefTable) {

    m_deathSubscription = m_eventBus->Subscribe<EntityDiedEvent>([this](const EntityDiedEvent& event) {
        m_deadEntities.push_back(event.entity);
    });
}

LootSystem::~LootSystem() {
    if (m_eventBus) {
        m_eventBus->Unsubscribe(m_deathSubscription);
    }
}

void LootSystem::Tick(SimContext& context) {
    if (m_deadEntities.empty()) {
        return;
    }

    std::vector<ECS::Entity> processingEntities;
    processingEntities.swap(m_deadEntities);

    for (ECS::Entity entity : processingEntities) {
        const LootComponent* lootComponent = m_registry->GetComponent<LootComponent>(entity);
        if (lootComponent) {
            const LootTableDef* tableDef = m_lootTableDefTable->Get(lootComponent->lootTableId);
            if (tableDef) {
                // Deterministic seed: SimContext.randomSeed XOR entity id
                Core::u64 seed = context.randomSeed ^ entity.id;
                SimRandom rng(seed);

                std::vector<ItemStack> drops;
                LootRoller::Roll(*tableDef, rng, drops);

                for (const ItemStack& stack : drops) {
                    ECS::Entity lootEntity = m_registry->Create();

                    DroppedLoot& droppedLoot = m_registry->AddComponent<DroppedLoot>(lootEntity);
                    droppedLoot.itemDefId = stack.defId;
                    droppedLoot.count = stack.count;
                    droppedLoot.droppedAtTick = context.tickNumber;

                    LootDroppedEvent dropEvent;
                    dropEvent.lootEntity = lootEntity;
                    dropEvent.itemDefId = stack.defId;
                    dropEvent.count = stack.count;

                    m_eventBus->Enqueue(EventChannel::GAMEPLAY, dropEvent);
                }
            }
        }
    }
}

Core::Result<bool> LootSystem::PickUp(ECS::Entity lootEntity, Inventory& into, const ItemDefTable& itemDefTable) {
    if (!m_registry->IsAlive(lootEntity)) {
        return Core::Result<bool>::Error("Loot entity is not alive");
    }

    DroppedLoot* droppedLoot = m_registry->GetComponent<DroppedLoot>(lootEntity);
    if (!droppedLoot) {
        return Core::Result<bool>::Error("Entity does not have DroppedLoot component");
    }

    if (droppedLoot->count == 0) {
        m_registry->Destroy(lootEntity);
        return true;
    }

    Core::u32 remainder = into.AddItem(itemDefTable, droppedLoot->itemDefId, droppedLoot->count);

    if (remainder == 0) {
        // Fully picked up
        m_registry->Destroy(lootEntity);
        return true;
    } else {
        // Partially picked up
        droppedLoot->count = remainder;
        return false;
    }
}

} // namespace Gameplay
} // namespace DungeonEngine
