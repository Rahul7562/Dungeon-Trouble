// ============================================================================
// DungeonTrouble Event System
// Complete migration of DungeonEngine/Events (C++17) to TypeScript
// ============================================================================

export enum EventChannel {
  SYSTEM = 0,
  GAMEPLAY = 1,
  RENDER = 2,
  UI = 3,
  COUNT = 4,
}

export class SubscriptionHandle {
  readonly id: number;
  private _valid = true;
  private _onRelease?: (id: number) => void;

  constructor(id: number, onRelease?: (id: number) => void) {
    this.id = id;
    this._onRelease = onRelease;
  }

  IsValid(): boolean {
    return this._valid;
  }

  Release(): void {
    if (this._valid) {
      this._valid = false;
      this._onRelease?.(this.id);
    }
  }
}

export class EventDispatcher {
  private nextId = 1;
  private listeners = new Map<string, Map<number, (ev: any) => void>>();

  Subscribe<T = any>(eventTypeOrFn: string | ((ev: T) => void), maybeFn?: (ev: T) => void): SubscriptionHandle {
    let eventType: string;
    let fn: (ev: T) => void;

    if (typeof eventTypeOrFn === 'string' && maybeFn) {
      eventType = eventTypeOrFn;
      fn = maybeFn;
    } else if (typeof eventTypeOrFn === 'function') {
      eventType = '*';
      fn = eventTypeOrFn;
    } else {
      eventType = '*';
      fn = () => {};
    }

    const id = this.nextId++;
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }
    this.listeners.get(eventType)!.set(id, fn);

    return new SubscriptionHandle(id, () => {
      this.UnsubscribeById(eventType, id);
    });
  }

  Unsubscribe(handle: SubscriptionHandle): void {
    handle.Release();
  }

  private UnsubscribeById(eventType: string, id: number): void {
    const map = this.listeners.get(eventType);
    if (map) {
      map.delete(id);
    }
  }

  Dispatch<T = any>(eventOrType: string | T, maybeEvent?: T): void {
    let eventType: string;
    let eventData: T;

    if (typeof eventOrType === 'string') {
      eventType = eventOrType;
      eventData = maybeEvent as T;
    } else {
      eventData = eventOrType;
      eventType = (eventData as any)?.type || (eventData as any)?.constructor?.name || '*';
    }

    // Specific listeners
    if (eventType !== '*') {
      const specific = this.listeners.get(eventType);
      if (specific) {
        // Snapshot to handle unsubscribe during dispatch
        const callbacks = Array.from(specific.values());
        for (const cb of callbacks) {
          cb(eventData);
        }
      }
    }

    // Global listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      const callbacks = Array.from(wildcard.values());
      for (const cb of callbacks) {
        cb(eventData);
      }
    }
  }
}

export class EventQueue {
  private queue: any[] = [];

  Enqueue(event: any): void {
    this.queue.push(event);
  }

  DispatchAll(dispatcher: EventDispatcher): void {
    const events = [...this.queue];
    this.queue = [];
    for (const ev of events) {
      dispatcher.Dispatch(ev);
    }
  }

  Clear(): void {
    this.queue = [];
  }

  Size(): number {
    return this.queue.length;
  }
}

export class EventBus {
  private dispatcher = new EventDispatcher();
  private queues: EventQueue[] = [];

  constructor() {
    for (let i = 0; i < EventChannel.COUNT; i++) {
      this.queues.push(new EventQueue());
    }
  }

  Subscribe<T = any>(
    channelOrTypeOrFn: EventChannel | string | ((ev: T) => void),
    maybeTypeOrFn?: string | ((ev: T) => void),
    maybeFn?: (ev: T) => void
  ): SubscriptionHandle {
    if (typeof channelOrTypeOrFn === 'function') {
      return this.dispatcher.Subscribe(channelOrTypeOrFn);
    }
    if (typeof maybeTypeOrFn === 'function') {
      return this.dispatcher.Subscribe(maybeTypeOrFn);
    }
    if (maybeFn) {
      return this.dispatcher.Subscribe(maybeTypeOrFn as string, maybeFn);
    }
    return this.dispatcher.Subscribe('*', () => {});
  }

  Unsubscribe(handle: SubscriptionHandle): void {
    this.dispatcher.Unsubscribe(handle);
  }

  DispatchImmediate<T = any>(event: T): void {
    this.dispatcher.Dispatch(event);
  }

  Enqueue<T = any>(channelOrEvent: EventChannel | T, maybeEvent?: T): void {
    let channel: EventChannel = EventChannel.GAMEPLAY;
    let event: T;

    if (typeof channelOrEvent === 'number' && maybeEvent !== undefined) {
      channel = channelOrEvent as EventChannel;
      event = maybeEvent;
    } else {
      event = channelOrEvent as T;
    }

    const idx = channel >= 0 && channel < EventChannel.COUNT ? channel : EventChannel.GAMEPLAY;
    this.queues[idx].Enqueue(event);
  }

  DispatchQueue(channel = EventChannel.GAMEPLAY): void {
    if (channel >= 0 && channel < EventChannel.COUNT) {
      this.queues[channel].DispatchAll(this.dispatcher);
    }
  }

  DispatchAllQueues(): void {
    for (const q of this.queues) {
      q.DispatchAll(this.dispatcher);
    }
  }

  ClearAllQueues(): void {
    for (const q of this.queues) {
      q.Clear();
    }
  }
}
