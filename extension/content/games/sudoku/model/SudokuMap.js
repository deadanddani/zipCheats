// Sudoku board model. Square grid of digits (0 = empty); a classic board is 9×9
// with 3×3 boxes. A cell is a plain object { row, col, box, value, given }.
// Ported from src/sudoku/models/{Cell,Map}.ts. Prefixed `Sudoku*` so it doesn't
// clash with Zip/Queens globals in the shared content-script scope.

// Box dimensions [rows, cols] for a board of `size`. A 9×9 board has 3×3 boxes,
// LinkedIn's 6×6 Mini Sudoku has 2-row × 3-col boxes, a 4×4 has 2×2. We pick the
// factor pair closest to a square so boxes tile the grid exactly.
function sudokuBoxDims(size) {
  let boxRows = Math.floor(Math.sqrt(size));
  while (boxRows > 1 && size % boxRows !== 0) boxRows--;
  return [boxRows, size / boxRows];
}

function createSudokuCells(grid) {
  const size = grid.length;
  const [boxRows, boxCols] = sudokuBoxDims(size);
  const boxesPerRow = size / boxCols;
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col];
      const box = Math.floor(row / boxRows) * boxesPerRow + Math.floor(col / boxCols);
      cells.push({ row, col, box, value, given: value !== 0 });
    }
  }
  return cells;
}

class SudokuMap {
  constructor(size, cells) {
    this.size = size;
    const [boxRows, boxCols] = sudokuBoxDims(size);
    this.boxRows = boxRows;
    this.boxCols = boxCols;
    this.cells = cells ?? createSudokuCells(SudokuMap.emptyGrid(size));
  }

  static emptyGrid(size) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  }

  static fromGrid(grid) {
    return new SudokuMap(grid.length, createSudokuCells(grid));
  }

  toGrid() {
    const grid = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    for (const cell of this.cells) grid[cell.row][cell.col] = cell.value;
    return grid;
  }

  cellAt(row, col) {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return undefined;
    return this.cells[row * this.size + col];
  }

  // The cells sharing this cell's row, column or box (excluding itself).
  peers(cell) {
    const set = new Set();
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

  conflictsFor(cell) {
    if (cell.value === 0) return [];
    return this.peers(cell).filter((peer) => peer.value === cell.value);
  }

  emptyCells() {
    return this.cells.filter((cell) => cell.value === 0);
  }

  // Digits 1..size that no peer of `cell` already uses.
  candidates(cell) {
    const used = new Set();
    for (const peer of this.peers(cell)) {
      if (peer.value !== 0) used.add(peer.value);
    }
    const result = [];
    for (let value = 1; value <= this.size; value++) {
      if (!used.has(value)) result.push(value);
    }
    return result;
  }

  // The empty cell with the fewest candidates (minimum-remaining-values), or null.
  mostConstrainedEmpty() {
    let best = null;
    let fewest = Infinity;
    for (const cell of this.cells) {
      if (cell.value !== 0) continue;
      const available = this.candidates(cell).length;
      if (available < fewest) {
        fewest = available;
        best = cell;
        if (fewest === 0) break;
      }
    }
    return best;
  }

  hasConflicts() {
    return this.cells.some((cell) => this.conflictsFor(cell).length > 0);
  }

  isSolvable() {
    return this.emptyCells().every((cell) => this.candidates(cell).length > 0);
  }
}
