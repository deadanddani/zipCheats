import type { Cell } from "./Cell";
import type { ZipMap } from "./Map";

export class Resolution {
  map: ZipMap;
  path: Cell[];
  onChange?: () => void;

  constructor(map: ZipMap) {
    this.map = map;
    this.path = [];
  }

  addStep(cell: Cell) {
    cell.visited = true;
    this.path.push(cell);
    this.onChange?.();
  }

  backStep() {
    const cell = this.path.pop();
    if (cell) {
      cell.visited = false;
      cell.validMoves = undefined;
    }
    this.onChange?.();
  }

  reset() {
    for (const cell of this.map.cells) {
      cell.visited = false;
      cell.validMoves = undefined;
    }
    this.path = [];
    this.onChange?.();
  }

  isCompleted(): boolean {
    if (!this.map.cells.every((cell) => cell.visited)) return false;

    let nodeNumber = 0;
    for (const cell of this.path) {
      if (cell.value === null) continue;
      if (cell.value <= nodeNumber) return false;
      nodeNumber = cell.value;
    }

    if (this.path[this.path.length - 1].value !== nodeNumber) {
      return false;
    }

    return true;
  }
}
