// ============================================================================
// DungeonTrouble ECS System
// Complete migration of DungeonEngine/ECS (C++17) to TypeScript
// ============================================================================

export class Entity {
  readonly id: number;

  static readonly INVALID_INDEX = 0xffffffff;
  static readonly INDEX_MASK = 0xffffffff;

  constructor(index: number = Entity.INVALID_INDEX, generation: number = 0) {
    // Pack 16 bits generation and 16 bits index into standard safe JS number,
    // or store directly with index & generation getters
    this._index = index >>> 0;
    this._generation = generation >>> 0;
    this.id = (this._generation * 0x100000000 + this._index);
  }

  private _index: number;
  private _generation: number;

  GetIndex(): number {
    return this._index;
  }

  GetGeneration(): number {
    return this._generation;
  }

  static Null(): Entity {
    return new Entity(Entity.INVALID_INDEX, 0);
  }

  Equals(other: Entity): boolean {
    return this._index === other._index && this._generation === other._generation;
  }

  toString(): string {
    return `Entity(${this._index}:${this._generation})`;
  }
}

export class EntityRegistry {
  private generations: number[] = [];
  private freeIndices: number[] = [];
  private aliveCount = 0;

  Create(): Entity {
    let index: number;
    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else {
      index = this.generations.length;
      this.generations.push(1);
    }
    this.aliveCount++;
    return new Entity(index, this.generations[index]);
  }

  Destroy(entity: Entity): boolean {
    const idx = entity.GetIndex();
    if (!this.IsAlive(entity)) {
      return false;
    }
    // Bump generation so old entity handles become invalid
    this.generations[idx] = (this.generations[idx] + 1) >>> 0;
    this.freeIndices.push(idx);
    this.aliveCount--;
    return true;
  }

  IsAlive(entity: Entity): boolean {
    const idx = entity.GetIndex();
    if (idx >= this.generations.length) return false;
    return this.generations[idx] === entity.GetGeneration();
  }

  GetAliveCount(): number {
    return this.aliveCount;
  }
}

export class View {
  private registry: Registry;
  private componentNames: string[];

  constructor(registry: Registry, componentNames: string[]) {
    this.registry = registry;
    this.componentNames = componentNames;
  }

  Each(fn: (entity: Entity, ...components: any[]) => void): void {
    const entities = this.registry.getAllEntities();
    for (const e of entities) {
      if (!this.registry.IsAlive(e)) continue;
      let hasAll = true;
      const comps: any[] = [];
      for (const name of this.componentNames) {
        const c = this.registry.GetComponent(e, name);
        if (c === undefined) {
          hasAll = false;
          break;
        }
        comps.push(c);
      }
      if (hasAll) {
        fn(e, ...comps);
      }
    }
  }

  Count(): number {
    let count = 0;
    this.Each(() => { count++; });
    return count;
  }
}

export class CommandBuffer {
  private commands: Array<(reg: Registry) => void> = [];

  AddComponent<T>(entity: Entity | number, name: string, comp?: T): void {
    this.commands.push(reg => {
      reg.AddComponent(entity, name, comp);
    });
  }

  RemoveComponent(entity: Entity | number, name: string): void {
    this.commands.push(reg => {
      reg.RemoveComponent(entity, name);
    });
  }

  DestroyEntity(entity: Entity | number): void {
    this.commands.push(reg => {
      reg.Destroy(entity);
    });
  }

  Flush(registry: Registry): void {
    const current = [...this.commands];
    this.commands = [];
    for (const cmd of current) {
      cmd(registry);
    }
  }

  Clear(): void {
    this.commands = [];
  }
}

export class Registry {
  private entityRegistry = new EntityRegistry();
  private entityMap = new Map<number, Entity>();
  private components = new Map<number, Map<string, any>>();

  Create(): Entity {
    const e = this.entityRegistry.Create();
    this.entityMap.set(e.GetIndex(), e);
    this.components.set(e.GetIndex(), new Map());
    return e;
  }

  Destroy(entityOrId: Entity | number): void {
    const idx = typeof entityOrId === 'number' ? entityOrId : entityOrId.GetIndex();
    const entity = this.entityMap.get(idx);
    if (entity) {
      this.entityRegistry.Destroy(entity);
      this.entityMap.delete(idx);
      this.components.delete(idx);
    }
  }

  IsAlive(entityOrId: Entity | number): boolean {
    if (typeof entityOrId === 'number') {
      const e = this.entityMap.get(entityOrId);
      return e ? this.entityRegistry.IsAlive(e) : false;
    }
    return this.entityRegistry.IsAlive(entityOrId);
  }

  AddComponent<T = any>(entityOrId: Entity | number, name: string, comp?: T): T {
    const idx = typeof entityOrId === 'number' ? entityOrId : entityOrId.GetIndex();
    if (!this.components.has(idx)) {
      this.components.set(idx, new Map());
    }
    const val = (comp !== undefined ? comp : {}) as T;
    this.components.get(idx)!.set(name, val);
    return val;
  }

  GetComponent<T = any>(entityOrId: Entity | number, name: string): T | undefined {
    const idx = typeof entityOrId === 'number' ? entityOrId : entityOrId.GetIndex();
    return this.components.get(idx)?.get(name);
  }

  HasComponent(entityOrId: Entity | number, name: string): boolean {
    const idx = typeof entityOrId === 'number' ? entityOrId : entityOrId.GetIndex();
    return Boolean(this.components.get(idx)?.has(name));
  }

  RemoveComponent(entityOrId: Entity | number, name: string): void {
    const idx = typeof entityOrId === 'number' ? entityOrId : entityOrId.GetIndex();
    this.components.get(idx)?.delete(name);
  }

  GetView(...componentNames: string[]): View {
    return new View(this, componentNames);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entityMap.values());
  }

  getAllWithComponents(names: string[]): number[] {
    const res: number[] = [];
    for (const [idx, compMap] of this.components.entries()) {
      const entity = this.entityMap.get(idx);
      if (entity && this.entityRegistry.IsAlive(entity) && names.every(n => compMap.has(n))) {
        res.push(idx);
      }
    }
    return res;
  }
}
