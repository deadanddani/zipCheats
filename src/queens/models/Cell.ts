export type QueenState = "empty" | "queen";

export interface QueenCell {
  row: number;
  col: number;
  region: number;
  queen: boolean;
  blocked: boolean;
  checked: boolean;
}

/** A Queens map is stored on disk as a 2D grid of region indices. */
export type RegionGrid = number[][];

export function createCells(regions: RegionGrid): QueenCell[] {
  const cells: QueenCell[] = [];
  for (let row = 0; row < regions.length; row++) {
    for (let col = 0; col < regions[row].length; col++) {
      cells.push({ row, col, region: regions[row][col], queen: false, blocked: false, checked: false });
    }
  }
  return cells;
}
