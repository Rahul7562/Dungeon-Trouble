import { describe, it, expect } from 'vitest';
import { EventBus, EventDispatcher, EventChannel } from '../src/engine/events';

describe('Event System Tests', () => {
  it('Synchronous Event Dispatching', () => {
    const dispatcher = new EventDispatcher();
    let receivedA = 0;
    let receivedB = 0;

    const handleA = dispatcher.Subscribe('EventA', (e: { value: number }) => {
      receivedA += e.value;
    });
    expect(handleA.IsValid()).toBe(true);

    const handleB = dispatcher.Subscribe('EventB', (e: { value: number }) => {
      receivedB += Math.floor(e.value);
    });
    expect(handleB.IsValid()).toBe(true);

    dispatcher.Dispatch('EventA', { value: 5 });
    expect(receivedA).toBe(5);
    expect(receivedB).toBe(0);

    dispatcher.Dispatch('EventB', { value: 3.5 });
    expect(receivedA).toBe(5);
    expect(receivedB).toBe(3);
  });

  it('Unsubscribe During Dispatch', () => {
    const dispatcher = new EventDispatcher();
    let calls1 = 0;
    let calls2 = 0;

    const handle1 = dispatcher.Subscribe('EventA', () => {
      calls1++;
      // Unsubscribe self during dispatch
      dispatcher.Unsubscribe(handle1);
    });

    const handle2 = dispatcher.Subscribe('EventA', () => {
      calls2++;
    });
    expect(handle2.IsValid()).toBe(true);

    // First dispatch should call both, but handle1 unsubscribes itself
    dispatcher.Dispatch('EventA', {});
    expect(calls1).toBe(1);
    expect(calls2).toBe(1);

    // Second dispatch should only call handle2
    dispatcher.Dispatch('EventA', {});
    expect(calls1).toBe(1);
    expect(calls2).toBe(2);
  });

  it('Deferred Queuing FIFO and Channels', () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.Subscribe((e: any) => {
      if (e.type === 'EventA' || e.type === 'EventB') {
        order.push(e.value);
      }
    });

    bus.Enqueue(EventChannel.SYSTEM, { type: 'EventA', value: 1 });
    bus.Enqueue(EventChannel.GAMEPLAY, { type: 'EventB', value: 2 });
    bus.Enqueue(EventChannel.SYSTEM, { type: 'EventA', value: 3 });

    // Should not be dispatched yet
    expect(order.length).toBe(0);

    // Dispatch SYSTEM channel only
    bus.DispatchQueue(EventChannel.SYSTEM);
    expect(order.length).toBe(2);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(3);

    // Dispatch GAMEPLAY channel
    bus.DispatchQueue(EventChannel.GAMEPLAY);
    expect(order.length).toBe(3);
    expect(order[2]).toBe(2);
  });

  it('Scale: 1000 Enqueued Events and Clear', () => {
    const bus = new EventBus();
    let total = 0;

    bus.Subscribe((e: any) => {
      if (e.value) total += e.value;
    });

    for (let i = 0; i < 1000; i++) {
      bus.Enqueue(EventChannel.GAMEPLAY, { value: 1 });
    }

    bus.DispatchAllQueues();
    expect(total).toBe(1000);

    // Now test clear
    bus.Enqueue(EventChannel.GAMEPLAY, { value: 999 });
    bus.ClearAllQueues();
    bus.DispatchAllQueues();
    expect(total).toBe(1000); // Unchanged because queue was cleared
  });
});
