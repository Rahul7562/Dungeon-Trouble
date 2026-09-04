import { describe, it, expect } from 'vitest';
import { SimRandom } from '../src/engine/simRandom';

describe('SimRandom', () => {
  it('generates consistent pseudo-random values with same seed', () => {
    const rng1 = new SimRandom(12345);
    const rng2 = new SimRandom(12345);

    for (let i = 0; i < 20; i++) {
      expect(rng1.nextUInt32()).toBe(rng2.nextUInt32());
    }

    const rng3 = new SimRandom(12345);
    const rng4 = new SimRandom(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng3.nextFloat01()).toBe(rng4.nextFloat01());
    }
  });

  it('produces ranges within expected boundaries', () => {
    const rng = new SimRandom(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextRange(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(15);
    }

    // Min >= max edge case
    expect(rng.nextRange(10, 5)).toBe(10);
    expect(rng.nextRange(7, 7)).toBe(7);
  });
});
