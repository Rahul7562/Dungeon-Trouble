import { describe, it, expect } from 'vitest';
import {
  TileType,
  TileMap,
  TileFlags,
  ZoneDef,
  SpawnKind,
  ZoneLoader,
  ZoneRegistry,
} from '../src/engine/world';
import { nearlyEqual } from './ecsHelper';

describe('World Tests', () => {
  it('TileMap coordinate conversions and queries', () => {
    // 8x6, tile size 32.0f, origin (-100.0, -100.0)
    const map = new TileMap(8, 6, 32.0, -100.0, -100.0);

    // Get and Set round-trip
    map.Set(2, 3, TileType.Water);
    expect(map.Get(2, 3)).toBe(TileType.Water);

    // Out-of-bounds Get returns Wall
    expect(map.Get(-1, 0)).toBe(TileType.Wall);
    expect(map.Get(8, 0)).toBe(TileType.Wall);
    expect(map.Get(0, 6)).toBe(TileType.Wall);
    expect(map.Get(0, -1)).toBe(TileType.Wall);

    // WorldToTile and TileToWorldCenter round-trip
    // Tile 1, 1 -> center is at origin + 1*32 + 16 = -100 + 48 = -52
    const wc = map.TileToWorldCenter(1, 1);
    expect(nearlyEqual(wc.x, -52.0)).toBe(true);
    expect(nearlyEqual(wc.y, -52.0)).toBe(true);

    const tc = map.WorldToTile(wc.x, wc.y);
    expect(tc.x).toBe(1);
    expect(tc.y).toBe(1);
  });

  it('TileFlags behavior', () => {
    expect(TileFlags.IsWalkable(TileType.Floor)).toBe(true);
    expect(TileFlags.IsWalkable(TileType.Wall)).toBe(false);

    expect(TileFlags.BlocksProjectiles(TileType.Wall)).toBe(true);
    expect(TileFlags.BlocksProjectiles(TileType.Floor)).toBe(false);

    expect(TileFlags.IsHazard(TileType.Pit)).toBe(true);
    expect(TileFlags.IsHazard(TileType.Water)).toBe(true);
    expect(TileFlags.IsHazard(TileType.Lava)).toBe(true);
    expect(TileFlags.IsHazard(TileType.Floor)).toBe(false);
  });

  it('ZoneLoader parsing - valid 8x6 zone', () => {
    const validZone =
      'zone 42 TestZone\n' +
      'size 8 6\n' +
      'tilesize 10.0 0.0 0.0\n' +
      '........\n' +
      '########\n' +
      '........\n' +
      'P_P_P_P_\n' +
      'WWWWLLLL\n' +
      '........\n' +
      'spawn 1 player 0 0 0\n' +
      'spawn 2 enemy 1 1 100\n' +
      'spawn 3 boss 7 5 200\n';

    const result = ZoneLoader.LoadFromText(validZone);
    expect(result.IsOk()).toBe(true);
    const zone = result.Get();

    expect(zone.id).toBe(42);
    expect(zone.name).toBe('TestZone');
    expect(zone.tiles.GetWidth()).toBe(8);
    expect(zone.tiles.GetHeight()).toBe(6);

    expect(zone.tiles.Get(0, 0)).toBe(TileType.Floor);
    expect(zone.tiles.Get(0, 1)).toBe(TileType.Wall);
    expect(zone.tiles.Get(0, 3)).toBe(TileType.Pit);
    expect(zone.tiles.Get(1, 3)).toBe(TileType.Empty);
    expect(zone.tiles.Get(0, 4)).toBe(TileType.Water);
    expect(zone.tiles.Get(4, 4)).toBe(TileType.Lava);

    expect(zone.spawns.length).toBe(3);
    expect(zone.spawns[0].kind).toBe(SpawnKind.PlayerStart);
    expect(zone.spawns[0].refId).toBe(0);
    const wc0 = zone.tiles.TileToWorldCenter(0, 0);
    expect(nearlyEqual(zone.spawns[0].x, wc0.x)).toBe(true);
    expect(nearlyEqual(zone.spawns[0].y, wc0.y)).toBe(true);

    expect(zone.spawns[2].kind).toBe(SpawnKind.Boss);
    expect(zone.spawns[2].refId).toBe(200);
    const wc2 = zone.tiles.TileToWorldCenter(7, 5);
    expect(nearlyEqual(zone.spawns[2].x, wc2.x)).toBe(true);
    expect(nearlyEqual(zone.spawns[2].y, wc2.y)).toBe(true);
  });

  it('ZoneLoader parsing - error cases mention line number', () => {
    const badHeader = 'size 8 6\n';
    const res1 = ZoneLoader.LoadFromText(badHeader);
    expect(res1.IsError()).toBe(true);
    expect(res1.GetError()).toContain('Line 1');

    const wrongWidth =
      'zone 1 T\n' +
      'size 8 6\n' +
      'tilesize 10 0 0\n' +
      '....\n';
    const res2 = ZoneLoader.LoadFromText(wrongWidth);
    expect(res2.IsError()).toBe(true);
    expect(res2.GetError()).toContain('Line 4');

    const wrongChars =
      'zone 1 T\n' +
      'size 2 1\n' +
      'tilesize 10 0 0\n' +
      '.X\n';
    const res3 = ZoneLoader.LoadFromText(wrongChars);
    expect(res3.IsError()).toBe(true);
    expect(res3.GetError()).toContain('Line 4');

    const badSpawn =
      'zone 1 T\n' +
      'size 1 1\n' +
      'tilesize 10 0 0\n' +
      '.\n' +
      'spawn 1 nope 0 0 0\n';
    const res4 = ZoneLoader.LoadFromText(badSpawn);
    expect(res4.IsError()).toBe(true);
    expect(res4.GetError()).toContain('Line 5');

    const dupSpawn =
      'zone 1 T\n' +
      'size 1 1\n' +
      'tilesize 10 0 0\n' +
      '.\n' +
      'spawn 1 player 0 0 0\n' +
      'spawn 1 player 0 0 0\n';
    const res5 = ZoneLoader.LoadFromText(dupSpawn);
    expect(res5.IsError()).toBe(true);
    expect(res5.GetError()).toContain('Line 6');
  });

  it('ZoneRegistry behavior', () => {
    const registry = new ZoneRegistry();
    const def: ZoneDef = {
      id: 10,
      name: 'Test',
      tiles: new TileMap(4, 4),
      spawns: [],
    };

    expect(registry.Register(def).IsOk()).toBe(true);
    expect(registry.Get(10)).toBeDefined();
    expect(registry.Get(10)!.name).toBe('Test');
    expect(registry.Get(99)).toBeUndefined();

    const dupDef: ZoneDef = {
      id: 10,
      name: 'Dup',
      tiles: new TileMap(4, 4),
      spawns: [],
    };
    expect(registry.Register(dupDef).IsError()).toBe(true);
  });
});

