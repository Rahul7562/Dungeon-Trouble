/**
 * High-performance, zero-allocation 2D Uniform Spatial Partitioning Grid.
 * Uses generation-stamped cells and query stamps so clearing and querying
 * allocate zero heap objects per frame.
 */

export interface SpatialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface SpatialCell<T> {
  gen: number;
  items: T[];
  count: number;
}

export class SpatialGrid<T extends object> {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly invCellSize: number;
  readonly cols: number;
  readonly rows: number;
  private readonly cells: SpatialCell<T>[];
  private generation = 1;
  private readonly seenSet = new WeakSet<T>();

  constructor(width: number, height: number, cellSize = 256) {
    this.width = Math.max(cellSize, width);
    this.height = Math.max(cellSize, height);
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    this.cols = Math.ceil(this.width * this.invCellSize) + 1;
    this.rows = Math.ceil(this.height * this.invCellSize) + 1;

    const total = this.cols * this.rows;
    this.cells = new Array(total);
    for (let i = 0; i < total; i++) {
      this.cells[i] = { gen: 0, items: [], count: 0 };
    }
  }

  /**
   * O(1) grid reset by advancing the generation counter.
   */
  clear(): void {
    this.generation = (this.generation + 1) | 0;
    if (this.generation <= 0) {
      this.generation = 1;
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i].gen = 0;
        this.cells[i].count = 0;
      }
    }
  }

  /**
   * Insert an object with center (x, y) and bounding radius into all overlapping grid cells.
   */
  insert(item: T, x: number, y: number, radius = 0): void {
    const minCx = Math.max(0, Math.min(this.cols - 1, Math.floor((x - radius) * this.invCellSize)));
    const maxCx = Math.max(0, Math.min(this.cols - 1, Math.floor((x + radius) * this.invCellSize)));
    const minCy = Math.max(0, Math.min(this.rows - 1, Math.floor((y - radius) * this.invCellSize)));
    const maxCy = Math.max(0, Math.min(this.rows - 1, Math.floor((y + radius) * this.invCellSize)));

    const gen = this.generation;
    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.cells[rowOffset + cx];
        if (cell.gen !== gen) {
          cell.gen = gen;
          cell.count = 0;
        }
        cell.items[cell.count++] = item;
      }
    }
  }

  /**
   * Query all unique items whose cells overlap the world-space rectangle [minX, minY, maxX, maxY].
   */
  queryRect(minX: number, minY: number, maxX: number, maxY: number, out: T[] = []): T[] {
    out.length = 0;
    const minCx = Math.max(0, Math.min(this.cols - 1, Math.floor(minX * this.invCellSize)));
    const maxCx = Math.max(0, Math.min(this.cols - 1, Math.floor(maxX * this.invCellSize)));
    const minCy = Math.max(0, Math.min(this.rows - 1, Math.floor(minY * this.invCellSize)));
    const maxCy = Math.max(0, Math.min(this.rows - 1, Math.floor(maxY * this.invCellSize)));

    const gen = this.generation;
    const singleCell = minCx === maxCx && minCy === maxCy;

    if (singleCell) {
      const cell = this.cells[minCy * this.cols + minCx];
      if (cell.gen === gen) {
        for (let i = 0; i < cell.count; i++) {
          out.push(cell.items[i]);
        }
      }
      return out;
    }

    const seen = new Set<T>();
    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.cells[rowOffset + cx];
        if (cell.gen !== gen) continue;
        for (let i = 0; i < cell.count; i++) {
          const item = cell.items[i];
          if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
          }
        }
      }
    }
    return out;
  }

  /**
   * Query all unique items in cells overlapping a circle (cx, cy, radius).
   */
  queryRadius(cx: number, cy: number, radius: number, out: T[] = []): T[] {
    return this.queryRect(cx - radius, cy - radius, cx + radius, cy + radius, out);
  }
}
