import type { QueenCell } from "./Cell";
import type { QueensMap } from "./Map";

/**
 * Holds the player's progress on a Queens board: which crowns are placed and,
 * derived from those, which empty cells are now blocked (a crown there would
 * break a rule). Mirrors the Zip `Resolution`: mutate through the methods and
 * subscribe via `onChange`.
 */
export class Resolution {
  map: QueensMap;
  queens: QueenCell[];
  onChange?: () => void;

  constructor(map: QueensMap) {
    this.map = map;
    this.queens = [];
    this.recomputeBlocked();
  }

  /** Re-derives `blocked` on every cell from the currently placed crowns. */
  recomputeBlocked() {
    for (const cell of this.map.cells) cell.blocked = false;
    for (const queen of this.queens) {
      for (const conflict of this.map.conflictsFor(queen)) {
        if (!conflict.queen) conflict.blocked = true;
      }
    }
  }

  /** Places a crown, unless the cell is blocked or already a crown. */
  placeQueen(cell: QueenCell): boolean {
    if (cell.queen || cell.blocked) return false;
    cell.queen = true;
    cell.checked = true;
    this.queens.push(cell);
    this.recomputeBlocked();
    this.onChange?.();
    return true;
  }

  removeQueen(cell: QueenCell) {
    if (!cell.queen) return;
    cell.queen = false;
    this.queens = this.queens.filter((queen) => queen !== cell);
    this.recomputeBlocked();
    this.onChange?.();
  }

  removeLast() {
    const cell = this.queens.pop();
    if (!cell) return;
    cell.queen = false;
    this.recomputeBlocked();
    this.onChange?.();
  }

  /** Place on empty, remove on crown — blocked cells stay untouched. */
  toggle(cell: QueenCell) {
    if (cell.queen) this.removeQueen(cell);
    else this.placeQueen(cell);
  }

  reset() {
    for (const cell of this.map.cells) {
      cell.queen = false;
      cell.blocked = false;
      cell.checked = false;
    }
    this.queens = [];
    this.onChange?.();
  }

  isCompleted(): boolean {
    return this.queens.length === this.map.size;
  }
}
