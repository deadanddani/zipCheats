import type { Cell } from "./Cell";

const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" } as const;
const offset = { top: [-1, 0], right: [0, 1], bottom: [1, 0], left: [0, -1] } as const;

export class ZipMap {
  rows: number;
  cols: number;
  cells: Cell[];

  constructor(rows: number, cols: number, cells?: Cell[]) {
    this.rows = rows;
    this.cols = cols;
    this.cells = cells ?? ZipMap.emptyCells(rows, cols);
  }

  private static emptyCells(rows: number, cols: number): Cell[] {
    const cells: Cell[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({ row, col, value: null, visited: false, walls: { top: false, right: false, bottom: false, left: false } });
      }
    }
    return cells;
  }

  static fromGrid(grid: Cell[][]): ZipMap {
    return new ZipMap(grid.length, grid[0]?.length ?? 0, grid.flat());
  }

  cellAt(row: number, col: number): Cell | undefined {
    return this.cells.find((cell) => cell.row === row && cell.col === col);
  }

  getFirstCell(): Cell | undefined {
    return this.cells.find((cell) => cell.value === 1);
  }

  getNode(value: number): Cell | undefined {
    return this.cells.find((cell) => cell.value === value);
  }

  addWall(row: number, col: number, side: keyof typeof opposite) {
    const cell = this.cellAt(row, col);
    if (!cell) return;
    cell.walls[side] = true;

    const [dr, dc] = offset[side];
    const neighbor = this.cellAt(row + dr, col + dc);
    if (neighbor) neighbor.walls[opposite[side]] = true;
  }

  isValidMove(a: Cell, b: Cell): boolean {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false;

    const side: keyof typeof opposite = dr === -1 ? 'top' : dr === 1 ? 'bottom' : dc === -1 ? 'left' : 'right';
    if (a.walls[side] || b.walls[opposite[side]]) return false;

    if (b.value !== null && b.value > 1 && !this.getNode(b.value - 1)?.visited) return false;

    return true;
  }

  populateValidMoves(cell: Cell): void {
    if (cell.validMoves !== undefined) return;

    const neighbors = (Object.keys(offset) as (keyof typeof offset)[])
      .map((side) => {
        const [dr, dc] = offset[side];
        return this.cellAt(cell.row + dr, cell.col + dc);
      })
      .filter((neighbor): neighbor is Cell => neighbor !== undefined)
      .filter((neighbor) => this.isValidMove(cell, neighbor));

    cell.validMoves = neighbors.map((neighbor) => ({ cell: neighbor, visited: neighbor.visited }));
  }
}
