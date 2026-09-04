// ============================================================================
// DungeonTrouble Math Library
// Complete migration of DungeonEngine/Math (C++17) to TypeScript
// ============================================================================

export const PI = 3.14159265358979323846;
export const PI_2 = 1.57079632679489661923;
export const PI_4 = 0.78539816339744830962;
export const PI_INV = 0.31830988618379067154;
export const TAU = 6.28318530717958647692;
export const EPSILON = 1e-6;
export const DEG_TO_RAD = PI / 180.0;
export const RAD_TO_DEG = 180.0 / PI;

export function abs(value: number): number {
  return Math.abs(value);
}

export function min(a: number, b: number): number {
  return Math.min(a, b);
}

export function max(a: number, b: number): number {
  return Math.max(a, b);
}

export function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.min(Math.max(value, minVal), maxVal);
}

export function saturate(value: number): number {
  return clamp(value, 0.0, 1.0);
}

export function sign(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

export function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

export function toDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}

export function nearlyEqual(a: number, b: number, epsilon = 0.001): boolean {
  const diff = Math.abs(a - b);
  return diff <= epsilon || diff < Math.max(Math.abs(a), Math.abs(b)) * epsilon;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function wrap(value: number, minVal: number, maxVal: number): number {
  const range = maxVal - minVal;
  if (range === 0) return minVal;
  let result = (value - minVal) % range;
  if (result < 0) result += range;
  return result + minVal;
}

export function pingPong(value: number, length: number): number {
  if (length <= 0) return 0;
  const t = wrap(value, 0, length * 2);
  return length - Math.abs(t - length);
}

export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static Zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static One(): Vector2 {
    return new Vector2(1, 1);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  mul(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector2 {
    return scalar !== 0 ? new Vector2(this.x / scalar, this.y / scalar) : new Vector2(0, 0);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalized(): Vector2 {
    const len = this.length();
    return len > 0 ? this.div(len) : new Vector2(0, 0);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  distance(v: Vector2): number {
    return this.sub(v).length();
  }

  distanceSq(v: Vector2): number {
    return this.sub(v).lengthSq();
  }

  lerp(target: Vector2, t: number): Vector2 {
    return new Vector2(lerp(this.x, target.x, t), lerp(this.y, target.y, t));
  }

  nearlyEqual(v: Vector2, eps = 0.001): boolean {
    return nearlyEqual(this.x, v.x, eps) && nearlyEqual(this.y, v.y, eps);
  }
}

export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static Zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
}

export class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r = 0, g = 0, b = 0, a = 1.0) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static fromRGB8(r: number, g: number, b: number, a = 255): Color {
    return new Color(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
  }

  static fromHex(hex: number): Color {
    return Color.fromRGB8(
      (hex >> 24) & 0xff,
      (hex >> 16) & 0xff,
      (hex >> 8) & 0xff,
      hex & 0xff
    );
  }

  static fromHSV(h: number, s: number, v: number, a = 1.0): Color {
    h = wrap(h, 0, 360) / 60.0;
    const c = v * s;
    const x = c * (1.0 - Math.abs((h % 2) - 1.0));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
    else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
    else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
    else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
    else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return new Color(r + m, g + m, b + m, a);
  }

  toCSS(): string {
    const r8 = Math.round(clamp(this.r, 0, 1) * 255);
    const g8 = Math.round(clamp(this.g, 0, 1) * 255);
    const b8 = Math.round(clamp(this.b, 0, 1) * 255);
    return `rgba(${r8}, ${g8}, ${b8}, ${this.a})`;
  }

  toHex(): number {
    const r8 = Math.round(clamp(this.r, 0, 1) * 255);
    const g8 = Math.round(clamp(this.g, 0, 1) * 255);
    const b8 = Math.round(clamp(this.b, 0, 1) * 255);
    const a8 = Math.round(clamp(this.a, 0, 1) * 255);
    return ((r8 << 24) | (g8 << 16) | (b8 << 8) | a8) >>> 0;
  }

  lerp(target: Color, t: number): Color {
    return new Color(
      lerp(this.r, target.r, t),
      lerp(this.g, target.g, t),
      lerp(this.b, target.b, t),
      lerp(this.a, target.a, t)
    );
  }
}

export const Collision = {
  CircleCircle(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const radSum = r1 + r2;
    return dx * dx + dy * dy <= radSum * radSum;
  },

  AABBAABB(
    minX1: number, minY1: number, maxX1: number, maxY1: number,
    minX2: number, minY2: number, maxX2: number, maxY2: number
  ): boolean {
    return maxX1 >= minX2 && minX1 <= maxX2 && maxY1 >= minY2 && minY1 <= maxY2;
  },

  CircleAABB(cx: number, cy: number, radius: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
    const closestX = clamp(cx, minX, maxX);
    const closestY = clamp(cy, minY, maxY);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  },

  PointInAABB(px: number, py: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
    return px >= minX && px <= maxX && py >= minY && py <= maxY;
  },

  PointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  }
};
