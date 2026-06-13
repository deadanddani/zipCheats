export interface SudokuCell {
  row: number;
  col: number;
  /** Index of the 3×3 box this cell belongs to (0..8). */
  box: number;
  /** The digit placed here, or 0 when the cell is empty. */
  value: number;
  /** A clue baked into the puzzle: fixed, the player can't change it. */
  given: boolean;
}

/** A Sudoku map is stored on disk as a 2D grid of digits (0 = empty). */
export type ValueGrid = number[][];

/** Box side length for a board of the given size (3 for a classic 9×9). */
export function boxSizeForSize(size: number): number {
  return Math.round(Math.sqrt(size));
}

export function createCells(grid: ValueGrid): SudokuCell[] {
  const size = grid.length;
  const boxSize = boxSizeForSize(size);
  const cells: SudokuCell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col];
      const box = Math.floor(row / boxSize) * boxSize + Math.floor(col / boxSize);
      cells.push({ row, col, box, value, given: value !== 0 });
    }
  }
  return cells;
}
