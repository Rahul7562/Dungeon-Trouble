import { ItemStack } from './types';
import { createItemStack, ItemDefTable, Inventory, Result } from './items';
import { SimRandom } from './simRandom';
import { SimContext } from './combat';

export interface LootEntry {
  itemDefId: number;
  weight: number;
  minCount: number;
  maxCount: number;
  guaranteed?: boolean;
}

export interface LootTableDef {
  id: number;
  name?: string;
  rolls: number;
  entries: LootEntry[];
}

export interface DroppedLoot {
  itemDefId: number;
  count: number;
  droppedAtTick: number;
  x?: number;
  y?: number;
}

export interface LootDroppedEvent {
  entity?: any;
  lootEntity?: any;
  itemDefId: number;
  count: number;
}

export class LootTableDefTable {
  private tables = new Map<number, LootTableDef>();

  Register(def: LootTableDef): void {
    this.tables.set(def.id, { ...def });
  }

  Get(id: number): LootTableDef | undefined {
    return this.tables.get(id);
  }

  register = this.Register.bind(this);
  get = this.Get.bind(this);
}

export class LootRoller {
  static Roll(table: LootTableDef, rng: SimRandom, out: ItemStack[]): void {
    const nonGuaranteed: LootEntry[] = [];
    let totalWeight = 0.0;

    for (const entry of table.entries) {
      if (entry.guaranteed) {
        const min = entry.minCount !== undefined ? entry.minCount : 1;
        const max = entry.maxCount !== undefined ? entry.maxCount : min;
        const count = rng.nextRange(min, max);
        if (count > 0) {
          out.push({
            itemDefId: entry.itemDefId,
            defId: entry.itemDefId,
            count,
          });
        }
      } else {
        const weight = entry.weight !== undefined ? entry.weight : 0.0;
        if (weight > 0) {
          nonGuaranteed.push(entry);
          totalWeight += weight;
        }
      }
    }

    if (nonGuaranteed.length === 0 || totalWeight <= 0.0) {
      return;
    }

    const rolls = table.rolls || 1;
    for (let i = 0; i < rolls; ++i) {
      const pick = rng.nextFloat01() * totalWeight;
      let currentWeight = 0.0;

      for (const entry of nonGuaranteed) {
        currentWeight += entry.weight !== undefined ? entry.weight : 0.0;
        if (pick <= currentWeight) {
          const min = entry.minCount !== undefined ? entry.minCount : 1;
          const max = entry.maxCount !== undefined ? entry.maxCount : min;
          const count = rng.nextRange(min, max);
          if (count > 0) {
            out.push({
              itemDefId: entry.itemDefId,
              defId: entry.itemDefId,
              count,
            });
          }
          break;
        }
      }
    }
  }

  static roll = LootRoller.Roll;
}

export class LootSystem {
  private registry: any;
  private eventBus: any;
  private lootTableDefTable: LootTableDefTable;
  private deadEntities: any[] = [];
  private unsubscribe?: () => void;

  constructor(registry: any, eventBus: any, lootTableDefTable: LootTableDefTable) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.lootTableDefTable = lootTableDefTable;

    if (this.eventBus && typeof this.eventBus.Subscribe === 'function') {
      this.unsubscribe = this.eventBus.Subscribe((ev: any) => {
        if (ev && ev.entity) {
          this.deadEntities.push(ev.entity);
        }
      });
    } else if (this.eventBus && typeof this.eventBus.subscribe === 'function') {
      this.unsubscribe = this.eventBus.subscribe('entityDied', (ev: any) => {
        if (ev && ev.entity) {
          this.deadEntities.push(ev.entity);
        }
      });
    }
  }

  OnEntityDied(entity: any): void {
    this.deadEntities.push(entity);
  }

  Tick(context: SimContext): void {
    if (this.deadEntities.length === 0) {
      return;
    }

    const processing = [...this.deadEntities];
    this.deadEntities = [];

    for (const entity of processing) {
      const lootComp = this.getLootComponent(entity);
      if (lootComp) {
        const tableDef = this.lootTableDefTable.Get(lootComp.lootTableId || lootComp);
        if (tableDef) {
          const rawSeed = context.randomSeed !== undefined ? context.randomSeed : 42;
          const entityId = typeof entity === 'number' ? entity : (entity.id || 0);
          const seed = BigInt(rawSeed) ^ BigInt(entityId);
          const rng = new SimRandom(seed);

          const drops: ItemStack[] = [];
          LootRoller.Roll(tableDef, rng, drops);

          for (const stack of drops) {
            let lootEntity: any;
            if (this.registry.Create) {
              lootEntity = this.registry.Create();
            } else if (this.registry.create) {
              lootEntity = this.registry.create();
            } else {
              lootEntity = { id: Math.floor(Math.random() * 1000000) };
            }

            const droppedData: DroppedLoot = {
              itemDefId: stack.defId ?? stack.itemDefId,
              count: stack.count,
              droppedAtTick: context.tickNumber,
            };

            if (this.registry.AddComponent) {
              this.registry.AddComponent(lootEntity, 'DroppedLoot', droppedData);
            } else if (this.registry.addComponent) {
              this.registry.addComponent(lootEntity, 'DroppedLoot', droppedData);
            } else {
              lootEntity.droppedLoot = droppedData;
            }

            const dropEvent: LootDroppedEvent = {
              lootEntity,
              itemDefId: stack.defId ?? stack.itemDefId,
              count: stack.count,
            };

            if (this.eventBus) {
              if (typeof this.eventBus.Enqueue === 'function') {
                this.eventBus.Enqueue(dropEvent);
              } else if (typeof this.eventBus.enqueue === 'function') {
                this.eventBus.enqueue(dropEvent);
              } else if (typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('lootDropped', dropEvent);
              }
            }
          }
        }
      }
    }
  }

  tick = this.Tick.bind(this);

  PickUp(
    lootEntity: any,
    into: Inventory,
    itemDefTable: ItemDefTable
  ): Result<boolean> {
    const isAlive = typeof this.registry.IsAlive === 'function'
      ? this.registry.IsAlive(lootEntity)
      : (typeof this.registry.isAlive === 'function' ? this.registry.isAlive(lootEntity) : true);

    if (!isAlive) {
      return Result.Error('Loot entity is not alive');
    }

    const droppedLoot = this.getDroppedLoot(lootEntity);
    if (!droppedLoot) {
      return Result.Error('Entity does not have DroppedLoot component');
    }

    if (droppedLoot.count === 0) {
      this.destroyEntity(lootEntity);
      return Result.Ok(true);
    }

    const remainder = into.AddItem(itemDefTable, droppedLoot.itemDefId, droppedLoot.count);

    if (remainder === 0) {
      this.destroyEntity(lootEntity);
      return Result.Ok(true);
    } else {
      droppedLoot.count = remainder;
      return Result.Ok(false);
    }
  }

  pickUp = this.PickUp.bind(this);

  private getLootComponent(e: any): any {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'LootComponent');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'LootComponent');
    }
    return e?.lootComponent;
  }

  private getDroppedLoot(e: any): DroppedLoot | undefined {
    if (this.registry.GetComponent) {
      return this.registry.GetComponent(e, 'DroppedLoot');
    }
    if (this.registry.getComponent) {
      return this.registry.getComponent(e, 'DroppedLoot');
    }
    return e?.droppedLoot;
  }

  private destroyEntity(e: any): void {
    if (typeof this.registry.Destroy === 'function') {
      this.registry.Destroy(e);
    } else if (typeof this.registry.destroy === 'function') {
      this.registry.destroy(e);
    }
  }
}

export const LOOT_TABLES: Record<string, LootTableDef> = {
  trash: {
    id: 1,
    name: 'Dungeon Minion Drop',
    rolls: 1,
    entries: [
      { itemDefId: 10, minCount: 1, maxCount: 2, weight: 35 },
      { itemDefId: 11, minCount: 1, maxCount: 2, weight: 28 },
      { itemDefId: 1, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 31, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 2, minCount: 1, maxCount: 1, weight: 9 },
      { itemDefId: 33, minCount: 1, maxCount: 1, weight: 9 },
      { itemDefId: 35, minCount: 1, maxCount: 1, weight: 9 },
    ],
  },
  elite: {
    id: 2,
    name: 'Elite Champion Drop',
    rolls: 2,
    entries: [
      { itemDefId: 10, minCount: 1, maxCount: 2, weight: 25, guaranteed: true },
      { itemDefId: 18, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 32, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 33, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 35, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 36, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 3, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 7, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 8, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 34, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 37, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 26, minCount: 1, maxCount: 2, weight: 20 },
    ],
  },
  boss: {
    id: 3,
    name: 'Dungeon Lord Cache',
    rolls: 3,
    entries: [
      { itemDefId: 26, minCount: 2, maxCount: 3, weight: 25, guaranteed: true },
      { itemDefId: 4, minCount: 1, maxCount: 1, weight: 22 },
      { itemDefId: 5, minCount: 1, maxCount: 1, weight: 22 },
      { itemDefId: 9, minCount: 1, maxCount: 1, weight: 22 },
      { itemDefId: 28, minCount: 1, maxCount: 1, weight: 20 },
      { itemDefId: 29, minCount: 1, maxCount: 1, weight: 20 },
      { itemDefId: 6, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 12, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 13, minCount: 1, maxCount: 1, weight: 15 },
      { itemDefId: 30, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 38, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 39, minCount: 1, maxCount: 1, weight: 14 },
      { itemDefId: 14, minCount: 2, maxCount: 3, weight: 30 },
    ],
  },
  chest: {
    id: 4,
    name: 'Ancient Treasure Chest',
    rolls: 2,
    entries: [
      { itemDefId: 10, minCount: 2, maxCount: 3, weight: 30, guaranteed: true },
      { itemDefId: 3, minCount: 1, maxCount: 1, weight: 20 },
      { itemDefId: 7, minCount: 1, maxCount: 1, weight: 20 },
      { itemDefId: 8, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 32, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 34, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 37, minCount: 1, maxCount: 1, weight: 18 },
      { itemDefId: 9, minCount: 1, maxCount: 1, weight: 12 },
      { itemDefId: 14, minCount: 1, maxCount: 2, weight: 25 },
      { itemDefId: 26, minCount: 1, maxCount: 2, weight: 25 },
      { itemDefId: 27, minCount: 1, maxCount: 2, weight: 25 },
    ],
  },
};

export function rollLoot(tableKey: string, seed?: number): ItemStack[] {
  const table = LOOT_TABLES[tableKey] || LOOT_TABLES.trash;
  const drops: ItemStack[] = [];
  const rng = seed !== undefined ? new SimRandom(seed) : null;
  const rand01 = () => (rng ? rng.nextFloat01() : Math.random());

  for (const entry of table.entries) {
    if (entry.guaranteed) {
      const min = entry.minCount || 1;
      const max = entry.maxCount || 1;
      const count = rng ? rng.nextRange(min, max) : Math.floor(Math.random() * (max - min + 1)) + min;
      drops.push(createItemStack(entry.itemDefId, count));
    }
  }

  const nonGuaranteed = table.entries.filter((e) => !e.guaranteed);
  const totalWeight = nonGuaranteed.reduce((sum: number, e: any) => sum + (e.weight || 0), 0);
  if (totalWeight <= 0) return drops;

  for (let r = 0; r < table.rolls; r++) {
    if (tableKey === 'trash' && rand01() > 0.65) continue;

    let pick = rand01() * totalWeight;
    for (const entry of nonGuaranteed) {
      const w = entry.weight || 0;
      if (pick <= w) {
        const min = entry.minCount || 1;
        const max = entry.maxCount || 1;
        const count = rng ? rng.nextRange(min, max) : Math.floor(Math.random() * (max - min + 1)) + min;
        drops.push(createItemStack(entry.itemDefId, count));
        break;
      }
      pick -= w;
    }
  }

  return drops;
}
