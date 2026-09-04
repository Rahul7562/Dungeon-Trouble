export class MockRegistry {
  private nextId = 1;
  private entities = new Set<number>();
  private components = new Map<number, Map<string, any>>();

  Create(): number {
    const id = this.nextId++;
    this.entities.add(id);
    this.components.set(id, new Map());
    return id;
  }

  Destroy(e: number): void {
    this.entities.delete(e);
    this.components.delete(e);
  }

  IsAlive(e: number): boolean {
    return this.entities.has(e);
  }

  AddComponent<T = any>(e: number, name: string, comp?: any): T {
    if (!this.components.has(e)) {
      this.components.set(e, new Map());
    }
    const val = comp !== undefined ? comp : {};
    this.components.get(e)!.set(name, val);
    return val;
  }

  GetComponent<T = any>(e: number, name: string): T | undefined {
    return this.components.get(e)?.get(name);
  }

  HasComponent(e: number, name: string): boolean {
    return Boolean(this.components.get(e)?.has(name));
  }

  RemoveComponent(e: number, name: string): void {
    this.components.get(e)?.delete(name);
  }

  getAllWithComponents(names: string[]): number[] {
    const res: number[] = [];
    for (const e of this.entities) {
      const map = this.components.get(e);
      if (map && names.every(n => map.has(n))) {
        res.push(e);
      }
    }
    return res;
  }
}

export class MockEventBus {
  private queue: any[] = [];
  private subscribers: Array<(ev: any) => void> = [];

  Enqueue(channelOrEv: any, ev?: any): void {
    this.queue.push(ev !== undefined ? ev : channelOrEv);
  }

  Subscribe(fn: (ev: any) => void): () => void {
    this.subscribers.push(fn);
    return () => {
      const idx = this.subscribers.indexOf(fn);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  DispatchQueue(channel?: any): void {
    const events = [...this.queue];
    this.queue = [];
    for (const ev of events) {
      for (const sub of [...this.subscribers]) {
        sub(ev);
      }
    }
  }

  ClearAllQueues(): void {
    this.queue = [];
  }
}

export function nearlyEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) <= epsilon;
}
