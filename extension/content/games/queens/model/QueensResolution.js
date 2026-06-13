// Tracks placed crowns and, derived from them, which empty cells are now blocked
// (a crown there would break a rule). Ported from src/queens/models/Resolution.ts;
// the async UI bits (onChange) are dropped since the extension solves synchronously.
class QueensResolution {
  constructor(map) {
    this.map = map;
    this.queens = [];
    this.recomputeBlocked();
  }

  // Re-derive `blocked` on every cell from the currently placed crowns.
  recomputeBlocked() {
    for (const cell of this.map.cells) cell.blocked = false;
    for (const queen of this.queens) {
      for (const conflict of this.map.conflictsFor(queen)) {
        if (!conflict.queen) conflict.blocked = true;
      }
    }
  }

  placeQueen(cell) {
    if (cell.queen || cell.blocked) return false;
    cell.queen = true;
    cell.checked = true;
    this.queens.push(cell);
    this.recomputeBlocked();
    return true;
  }

  removeLast() {
    const cell = this.queens.pop();
    if (!cell) return;
    cell.queen = false;
    this.recomputeBlocked();
  }

  reset() {
    for (const cell of this.map.cells) {
      cell.queen = false;
      cell.blocked = false;
      cell.checked = false;
    }
    this.queens = [];
  }

  isCompleted() {
    return this.queens.length === this.map.size;
  }

  // Queen positions as { row, col }, in placement order.
  positions() {
    return this.queens.map((cell) => ({ row: cell.row, col: cell.col }));
  }
}
