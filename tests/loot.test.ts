import { describe, it, expect } from 'vitest';
import {
  LootTableDef,
  LootEntry,
  ItemStack,
  ItemDef,
  ItemRarity,
  EquipSlot,
  DroppedLoot,
  LootComponent,
} from '../src/engine/types';
import { LootRoller, LootTableDefTable, LootSystem } from '../src/engine/loot';
import { ItemDefTable, Inventory } from '../src/engine/items';
import { SimRandom } from '../src/engine/simRandom';
import { MockRegistry, MockEventBus } from './ecsHelper';

describe('Gameplay - Loot Tests', () => {
  it('LootRoller logic', () => {
    const table: LootTableDef = {
      id: 1,
      rolls: 2,
      entries: [
        // Guaranteed item
        {
          itemDefId: 100,
          minCount: 2,
          maxCount: 2,
          weight: 1.0,
          guaranteed: true,
        },
        // Weighted item 1
        {
          itemDefId: 200,
          minCount: 1,
          maxCount: 3,
          weight: 10.0,
          guaranteed: false,
        },
        // Weighted item 2
        {
          itemDefId: 300,
          minCount: 1,
          maxCount: 1,
          weight: 5.0,
          guaranteed: false,
        },
      ],
    };

    const rng = new SimRandom(12345);
    const drops: ItemStack[] = [];

    LootRoller.Roll(table, rng, drops);

    expect(drops.length).toBeGreaterThanOrEqual(1);

    let foundGuaranteed = false;
    for (const drop of drops) {
      if (drop.defId === 100) {
        foundGuaranteed = true;
        expect(drop.count).toBe(2);
      }
    }
    expect(foundGuaranteed).toBe(true);

    for (const drop of drops) {
      if (drop.defId === 200) {
        expect(drop.count).toBeGreaterThanOrEqual(1);
        expect(drop.count).toBeLessThanOrEqual(3);
      } else if (drop.defId === 300) {
        expect(drop.count).toBe(1);
      }
    }
  });

  it('LootRoller handles zero weight correctly', () => {
    const table: LootTableDef = {
      id: 1,
      rolls: 10,
      entries: [
        {
          itemDefId: 100,
          minCount: 1,
          maxCount: 1,
          weight: 0.0,
          guaranteed: false,
        },
      ],
    };

    const rng = new SimRandom(1);
    const drops: ItemStack[] = [];
    LootRoller.Roll(table, rng, drops);
    expect(drops.length).toBe(0);
  });

  it('LootSystem End-to-End', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const lootTableDefTable = new LootTableDefTable();

    const table: LootTableDef = {
      id: 1,
      rolls: 1,
      entries: [
        {
          itemDefId: 500,
          minCount: 5,
          maxCount: 5,
          weight: 1.0,
          guaranteed: true,
        },
      ],
    };
    lootTableDefTable.Register(table);

    const lootSystem = new LootSystem(registry, eventBus, lootTableDefTable);

    const enemy = registry.Create();
    registry.AddComponent<LootComponent>(enemy, 'LootComponent', { lootTableId: 1 });

    // Kill enemy
    eventBus.Enqueue({ entity: enemy, killer: 0 });
    eventBus.DispatchQueue(); // Send to LootSystem

    const context = { tickNumber: 10, dt: 0.033, randomSeed: 42 };
    lootSystem.Tick(context);

    // Verify LootDroppedEvent
    let dropEvents = 0;
    let droppedEntity = 0;
    eventBus.Subscribe((e: any) => {
      if (e.lootEntity !== undefined) {
        dropEvents++;
        droppedEntity = e.lootEntity;
        expect(e.itemDefId).toBe(500);
        expect(e.count).toBe(5);
      }
    });

    eventBus.DispatchQueue();
    expect(dropEvents).toBe(1);

    // Verify ECS component
    expect(registry.IsAlive(droppedEntity)).toBe(true);
    const dropComp = registry.GetComponent<DroppedLoot>(droppedEntity, 'DroppedLoot');
    expect(dropComp).toBeDefined();
    expect(dropComp!.itemDefId).toBe(500);
    expect(dropComp!.count).toBe(5);
    expect(dropComp!.droppedAtTick).toBe(10);

    // Test Pickup
    const itemDefTable = new ItemDefTable();
    const itemDef: ItemDef = {
      id: 500,
      name: 'Gold',
      rarity: ItemRarity.Common,
      slot: EquipSlot.None,
      maxStack: 10,
      equipModifiers: [],
    };
    itemDefTable.Register(itemDef);

    const inv = new Inventory(5);
    const res = lootSystem.PickUp(droppedEntity, inv, itemDefTable);
    expect(res.IsOk()).toBe(true);
    expect(res.Get()).toBe(true); // fully picked up

    expect(registry.IsAlive(droppedEntity)).toBe(false); // Entity destroyed
    expect(inv.CountOf(500)).toBe(5);
  });

  it('LootSystem Partial Pickup', () => {
    const registry = new MockRegistry();
    const eventBus = new MockEventBus();
    const lootTableDefTable = new LootTableDefTable();
    const lootSystem = new LootSystem(registry, eventBus, lootTableDefTable);

    const itemDefTable = new ItemDefTable();
    const itemDef: ItemDef = {
      id: 500,
      name: 'Gold',
      rarity: ItemRarity.Common,
      slot: EquipSlot.None,
      maxStack: 2, // Can only hold 2 per stack
      equipModifiers: [],
    };
    itemDefTable.Register(itemDef);

    const lootEntity = registry.Create();
    registry.AddComponent<DroppedLoot>(lootEntity, 'DroppedLoot', {
      itemDefId: 500,
      count: 5,
      droppedAtTick: 0,
    });

    const inv = new Inventory(1); // 1 slot, max stack 2
    const res = lootSystem.PickUp(lootEntity, inv, itemDefTable);
    expect(res.IsOk()).toBe(true);
    expect(res.Get()).toBe(false); // partially picked up

    expect(registry.IsAlive(lootEntity)).toBe(true);
    const dropComp = registry.GetComponent<DroppedLoot>(lootEntity, 'DroppedLoot')!;
    expect(dropComp).toBeDefined();
    expect(dropComp.count).toBe(3); // 5 - 2 = 3 left
    expect(inv.CountOf(500)).toBe(2);
  });

  it('LootSystem Determinism', () => {
    const registry1 = new MockRegistry();
    const registry2 = new MockRegistry();
    const eventBus1 = new MockEventBus();
    const eventBus2 = new MockEventBus();
    const lootTableDefTable = new LootTableDefTable();

    const table: LootTableDef = {
      id: 1,
      rolls: 5,
      entries: [
        {
          itemDefId: 100,
          minCount: 1,
          maxCount: 3,
          weight: 10.0,
          guaranteed: false,
        },
      ],
    };
    lootTableDefTable.Register(table);

    const lootSystem1 = new LootSystem(registry1, eventBus1, lootTableDefTable);
    const lootSystem2 = new LootSystem(registry2, eventBus2, lootTableDefTable);

    const enemy1 = registry1.Create();
    registry1.AddComponent<LootComponent>(enemy1, 'LootComponent', { lootTableId: 1 });
    const enemy2 = registry2.Create();
    registry2.AddComponent<LootComponent>(enemy2, 'LootComponent', { lootTableId: 1 });

    eventBus1.Enqueue({ entity: enemy1 });
    eventBus2.Enqueue({ entity: enemy2 });

    eventBus1.DispatchQueue();
    eventBus2.DispatchQueue();

    const context = { tickNumber: 0, dt: 0.033, randomSeed: 4242 };

    const drops1: ItemStack[] = [];
    eventBus1.Subscribe((e: any) => {
      if (e.lootEntity !== undefined) drops1.push({ defId: e.itemDefId, count: e.count });
    });

    const drops2: ItemStack[] = [];
    eventBus2.Subscribe((e: any) => {
      if (e.lootEntity !== undefined) drops2.push({ defId: e.itemDefId, count: e.count });
    });

    expect(enemy1).toBe(enemy2);

    lootSystem1.Tick(context);
    lootSystem2.Tick(context);

    eventBus1.DispatchQueue();
    eventBus2.DispatchQueue();

    expect(drops1.length).toBe(drops2.length);
    for (let i = 0; i < drops1.length; ++i) {
      expect(drops1[i].defId).toBe(drops2[i].defId);
      expect(drops1[i].count).toBe(drops2[i].count);
    }
  });
});
