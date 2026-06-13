// Tracks the digits filled on top of a Sudoku board's fixed clues. Ported from
// src/sudoku/models/Resolution.ts; the async onChange hook is dropped since the
// extension solves synchronously.
class SudokuResolution {
  constructor(map) {
    this.map = map;
  }

  // Writes a digit into an editable cell. Clues (givens) are left untouched.
  setValue(cell, value) {
    if (cell.given) return false;
    if (value < 0 || value > this.map.size) return false;
    if (cell.value === value) return false;
    cell.value = value;
    return true;
  }

  clearValue(cell) {
    if (cell.given || cell.value === 0) return;
    cell.value = 0;
  }

  // Empties every cell the solver filled, keeping the puzzle's clues.
  reset() {
    for (const cell of this.map.cells) {
      if (!cell.given && cell.value !== 0) cell.value = 0;
    }
  }

  isCompleted() {
    return this.map.emptyCells().length === 0 && !this.map.hasConflicts();
  }
}
