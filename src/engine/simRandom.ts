export class SimRandom {
  private state: bigint;

  constructor(seed: number | bigint = 0) {
    const s = BigInt(seed) & 0xffffffffffffffffn;
    this.state = s !== 0n ? s : 0x1234567890abcdefn;
  }

  nextUInt32(): number {
    this.state = (this.state ^ (this.state >> 12n)) & 0xffffffffffffffffn;
    this.state = (this.state ^ ((this.state << 25n) & 0xffffffffffffffffn)) & 0xffffffffffffffffn;
    this.state = (this.state ^ (this.state >> 27n)) & 0xffffffffffffffffn;
    const mult = (this.state * 0x2545f4914f6cdd1dn) & 0xffffffffffffffffn;
    return Number((mult >> 32n) & 0xffffffffn);
  }

  NextUInt32(): number {
    return this.nextUInt32();
  }

  nextFloat01(): number {
    return this.nextUInt32() / 0xffffffff;
  }

  NextFloat01(): number {
    return this.nextFloat01();
  }

  nextRange(min: number, max: number): number {
    if (min >= max) return min;
    const range = (max - min + 1) >>> 0;
    const rand = this.nextUInt32();
    return min + (rand % range);
  }

  NextRange(min: number, max: number): number {
    return this.nextRange(min, max);
  }
}
