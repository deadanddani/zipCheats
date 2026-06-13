import { boxSizeForSize, createCells, type SudokuCell, type ValueGrid } from "./Cell";

export class SudokuMap {
  /** Boards are square: a classic Sudoku is 9×9 with 3×3 boxes. */
  size: number;
  boxSize: number;
  cells: SudokuCell[];

  constructor(size: number, cells?: SudokuCell[]) {
    this.size = size;
    this.boxSize = boxSizeForSize(size);
    this.cells = cells ?? createCells(SudokuMap.emptyGrid(size));
  }

  private static emptyGrid(size: number): ValueGrid {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  }

  static fromGrid(grid: ValueGrid): SudokuMap {
    return new SudokuMap(grid.length, createCells(grid));
  }

  toGrid(): ValueGrid {
    const grid: ValueGrid = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    for (const cell of this.cells) grid[cell.row][cell.col] = cell.value;
    return grid;
  }

  cellAt(row: number, col: number): SudokuCell | undefined {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return undefined;
    return this.cells[row * this.size + col];
  }

  /** The cells sharing this cell's row, column or box (excluding itself). */
  peers(cell: SudokuCell): SudokuCell[] {
    const set = new Set<SudokuCell>();
    for (let i = 0; i < this.size; i++) {
      const inRow = this.cellAt(cell.row, i);
      const inCol = this.cellAt(i, cell.col);
      if (inRow) set.add(inRow);
      if (inCol) set.add(inCol);
    }
    for (const other of this.cells) {
      if (other.box === cell.box) set.add(other);
    }
    set.delete(cell);
    return [...set];
  }

  /** Peers that already hold the same (non-empty) digit as `cell`. */
  conflictsFor(cell: SudokuCell): SudokuCell[] {
    if (cell.value === 0) return [];
    return this.peers(cell).filter((peer) => peer.value === cell.value);
  }

  emptyCells(): SudokuCell[] {
    return this.cells.filter((cell) => cell.value === 0);
  }

  /** Digits 1..size that no peer of `cell` already uses. */
  candidates(cell: SudokuCell): number[] {
    const used = new Set<number>();
    for (const peer of this.peers(cell)) {
      if (peer.value !== 0) used.add(peer.value);
    }
    const result: number[] = [];
    for (let value = 1; value <= this.size; value++) {
      if (!used.has(value)) result.push(value);
    }
    return result;
  }

  /**
   * The empty cell with the fewest candidates (minimum-remaining-values), with
   * ties broken by position so the choice is deterministic across backtracks.
   * Returns null when the board is full.
   */
  mostConstrainedEmpty(): SudokuCell | null {
    let best: SudokuCell | null = null;
    let fewest = Infinity;
    for (const cell of this.cells) {
      if (cell.value !== 0) continue;
      const available = this.candidates(cell).length;
      if (available < fewest) {
        fewest = available;
        best = cell;
        if (fewest === 0) break; // a dead cell can't get any better
      }
    }
    return best;
  }

  /** True while no two peers share a digit anywhere on the board. */
  hasConflicts(): boolean {
    return this.cells.some((cell) => this.conflictsFor(cell).length > 0);
  }

  /** A quick prune: every empty cell still has at least one legal digit. */
  isSolvable(): boolean {
    return this.emptyCells().every((cell) => this.candidates(cell).length > 0);
  }
}
