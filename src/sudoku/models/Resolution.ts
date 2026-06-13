import type { SudokuCell } from "./Cell";
import type { SudokuMap } from "./Map";

/**
 * Holds the player's progress on a Sudoku board: the digits they've entered on
 * top of the puzzle's fixed clues. Mirrors the Queens `Resolution` — mutate
 * through the methods and subscribe via `onChange`.
 */
export class Resolution {
  map: SudokuMap;
  onChange?: () => void;

  constructor(map: SudokuMap) {
    this.map = map;
  }

  /** Writes a digit into an editable cell. Clues (givens) are left untouched. */
  setValue(cell: SudokuCell, value: number): boolean {
    if (cell.given) return false;
    if (value < 0 || value > this.map.size) return false;
    if (cell.value === value) return false;
    cell.value = value;
    this.onChange?.();
    return true;
  }

  clearValue(cell: SudokuCell) {
    if (cell.given || cell.value === 0) return;
    cell.value = 0;
    this.onChange?.();
  }

  /** Empties every cell the player filled, keeping the puzzle's clues. */
  reset() {
    let changed = false;
    for (const cell of this.map.cells) {
      if (!cell.given && cell.value !== 0) {
        cell.value = 0;
        changed = true;
      }
    }
    if (changed) this.onChange?.();
  }

  /** Solved when every cell holds a digit and no rule is broken. */
  isCompleted(): boolean {
    return this.map.emptyCells().length === 0 && !this.map.hasConflicts();
  }
}
