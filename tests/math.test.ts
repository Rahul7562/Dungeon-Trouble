import { describe, it, expect } from 'vitest';
import {
  nearlyEqual,
  clamp,
  saturate,
  sign,
  toRadians,
  toDegrees,
  wrap,
  pingPong,
  Vector2,
  Vector3,
  Color,
  Collision,
} from '../src/engine/math';

describe('Math Library Tests', () => {
  it('Basic math utils: clamp, saturate, sign, nearlyEqual', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);

    expect(saturate(-0.5)).toBe(0);
    expect(saturate(0.5)).toBe(0.5);
    expect(saturate(1.5)).toBe(1);

    expect(sign(10)).toBe(1);
    expect(sign(-10)).toBe(-1);
    expect(sign(0)).toBe(0);

    expect(nearlyEqual(1.0, 1.0001, 0.001)).toBe(true);
    expect(nearlyEqual(1.0, 1.1, 0.001)).toBe(false);
  });

  it('Angle conversions and wrapping', () => {
    expect(nearlyEqual(toRadians(180), Math.PI)).toBe(true);
    expect(nearlyEqual(toDegrees(Math.PI), 180)).toBe(true);

    expect(wrap(370, 0, 360)).toBe(10);
    expect(wrap(-10, 0, 360)).toBe(350);

    expect(pingPong(1.5, 1.0)).toBe(0.5);
    expect(pingPong(2.5, 1.0)).toBe(0.5);
  });

  it('Vector2 operations', () => {
    const v1 = new Vector2(3, 4);
    expect(v1.length()).toBe(5);
    expect(v1.lengthSq()).toBe(25);

    const norm = v1.normalized();
    expect(nearlyEqual(norm.length(), 1.0)).toBe(true);
    expect(nearlyEqual(norm.x, 0.6)).toBe(true);
    expect(nearlyEqual(norm.y, 0.8)).toBe(true);

    const v2 = new Vector2(1, 2);
    const added = v1.add(v2);
    expect(added.x).toBe(4);
    expect(added.y).toBe(6);

    const subbed = v1.sub(v2);
    expect(subbed.x).toBe(2);
    expect(subbed.y).toBe(2);

    expect(v1.dot(v2)).toBe(11); // 3*1 + 4*2
    expect(v1.distance(new Vector2(3, 7))).toBe(3);
  });

  it('Vector3 operations', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const c = a.cross(b);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(c.z).toBe(1);
    expect(a.dot(b)).toBe(0);
  });

  it('Color operations and conversions', () => {
    const red = Color.fromRGB8(255, 0, 0, 255);
    expect(red.r).toBe(1);
    expect(red.g).toBe(0);
    expect(red.b).toBe(0);
    expect(red.a).toBe(1);

    const fromHex = Color.fromHex(0xff0000ff);
    expect(fromHex.r).toBe(1);
    expect(fromHex.g).toBe(0);
    expect(fromHex.b).toBe(0);

    const hsvRed = Color.fromHSV(0, 1, 1);
    expect(nearlyEqual(hsvRed.r, 1.0)).toBe(true);
    expect(nearlyEqual(hsvRed.g, 0.0)).toBe(true);
    expect(nearlyEqual(hsvRed.b, 0.0)).toBe(true);

    const css = red.toCSS();
    expect(css).toBe('rgba(255, 0, 0, 1)');
  });

  it('Collision checks', () => {
    // Circles
    expect(Collision.CircleCircle(0, 0, 5, 8, 0, 5)).toBe(true);
    expect(Collision.CircleCircle(0, 0, 5, 12, 0, 5)).toBe(false);

    // AABBs
    expect(Collision.AABBAABB(0, 0, 10, 10, 5, 5, 15, 15)).toBe(true);
    expect(Collision.AABBAABB(0, 0, 10, 10, 15, 15, 25, 25)).toBe(false);

    // Circle - AABB
    expect(Collision.CircleAABB(0, 0, 5, 3, 0, 10, 10)).toBe(true);
    expect(Collision.CircleAABB(0, 0, 5, 10, 10, 20, 20)).toBe(false);

    // Points
    expect(Collision.PointInAABB(5, 5, 0, 0, 10, 10)).toBe(true);
    expect(Collision.PointInAABB(15, 5, 0, 0, 10, 10)).toBe(false);
    expect(Collision.PointInCircle(3, 4, 0, 0, 5)).toBe(true);
    expect(Collision.PointInCircle(5, 5, 0, 0, 5)).toBe(false);
  });
});
