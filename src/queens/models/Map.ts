import { createCells, type QueenCell, type RegionGrid } from "./Cell";

/** The 8 king-move directions: two queens may not touch, including diagonally. */
const TOUCHING = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export class QueensMap {
  /** Boards are always square: one queen per row, column and region. */
  size: number;
  cells: QueenCell[];
  /** Number of distinct colored regions (equals `size` in a valid puzzle). */
  regionCount: number;

  constructor(size: number, cells?: QueenCell[]) {
    this.size = size;
    this.cells = cells ?? createCells(QueensMap.emptyRegions(size));
    this.regionCount = new Set(this.cells.map((cell) => cell.region)).size;
  }

  private static emptyRegions(size: number): RegionGrid {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  }

  static fromGrid(regions: RegionGrid): QueensMap {
    return new QueensMap(regions.length, createCells(regions));
  }

  toGrid(): RegionGrid {
    const grid: RegionGrid = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    for (const cell of this.cells) grid[cell.row][cell.col] = cell.region;
    return grid;
  }

  cellAt(row: number, col: number): QueenCell | undefined {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return undefined;
    return this.cells[row * this.size + col];
  }

  regionCells(region: number): QueenCell[] {
    return this.cells.filter((cell) => cell.region === region);
  }

  touching(cell: QueenCell): QueenCell[] {
    return TOUCHING.map(([dr, dc]) => this.cellAt(cell.row + dr, cell.col + dc)).filter((neighbor): neighbor is QueenCell => neighbor !== undefined);
  }

  conflictsFor(cell: QueenCell): QueenCell[] {
    const set = new Set<QueenCell>();
    for (let i = 0; i < this.size; i++) {
      const inRow = this.cellAt(cell.row, i);
      const inCol = this.cellAt(i, cell.col);
      if (inRow) set.add(inRow);
      if (inCol) set.add(inCol);
    }
    for (const same of this.regionCells(cell.region)) set.add(same);
    for (const neighbor of this.touching(cell)) set.add(neighbor);
    set.delete(cell);
    return [...set];
  }

  getValidCells(region: number): QueenCell[] {
    return this.cells.filter((cell) => cell.region === region && !cell.queen && !cell.blocked);
  }

  getAllRegions(): Set<number> {
    return new Set(this.cells.map((cell) => cell.region));
  }

  getRegionWithLessValidCells(): number | null {
    let resultRegion: number | null = null;
    let lessNumberOfValidCells = Infinity;
    const allRegions = this.getAllRegions();

    for (const region of allRegions) {
      const hasQueen = this.regionCells(region).some((cell) => cell.queen);
      if (hasQueen) continue;

      const cells: QueenCell[] = this.getValidCells(region);
      if (cells.length < lessNumberOfValidCells) {
        lessNumberOfValidCells = cells.length;
        resultRegion = region;
      }
    }
    return resultRegion;
  }

  getRegionsWithoutQueens(): Set<number> {
    const regionsWithQueens: Set<number> = new Set(this.cells.filter((cell) => cell.queen).map((cell) => cell.region));
    const regionsWithoutQueens: Set<number> = new Set(this.cells.map((cell) => cell.region));
    for (const region of regionsWithQueens) regionsWithoutQueens.delete(region);
    return regionsWithoutQueens;
  }

  isSolvable(): boolean {
    const noQueenRegions: Set<number> = this.getRegionsWithoutQueens();

    for (const region of noQueenRegions) {
      if (this.getValidCells(region).length === 0) return false;
    }
    return true;
  }

  getFirstValidCell(region: number): QueenCell | null {
    const validCells = this.getValidCells(region);
    if (validCells.length === 0) return null;
    return validCells[0];
  }
}
