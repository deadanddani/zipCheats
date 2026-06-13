// Tango board model. A square grid (LinkedIn ships 6×6) filled with two symbols,
// Sun (1) and Moon (2); 0 = empty. Rules:
//   • no three of the same symbol in a row, horizontally or vertically;
//   • each row and each column holds equal counts of Sun and Moon;
//   • "=" links force the two cells equal, "×" links force them different.
// A cell is a plain object { row, col, value, given }. Prefixed `Tango*` so it
// doesn't clash with other games' globals in the shared content-script scope.
const TANGO_SUN = 1;
const TANGO_MOON = 2;

function createTangoCells(grid) {
  const cells = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col] || 0;
      cells.push({ row, col, value, given: value !== 0 });
    }
  }
  return cells;
}

class TangoMap {
  // constraints: [{ r1, c1, r2, c2, type: '=' | 'x' }] between orthogonal neighbours.
  constructor(size, cells, constraints) {
    this.size = size;
    this.cells = cells ?? createTangoCells(TangoMap.emptyGrid(size));
    this.constraints = constraints ?? [];
    this._index = this.indexConstraints();
  }

  static emptyGrid(size) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  }

  static fromGrid(grid, constraints) {
    return new TangoMap(grid.length, createTangoCells(grid), constraints ?? []);
  }

  // Key a cell pair order-independently so we can look a link up from either side.
  static pairKey(r1, c1, r2, c2) {
    const a = `${r1},${c1}`;
    const b = `${r2},${c2}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  indexConstraints() {
    const map = new Map();
    for (const k of this.constraints) {
      map.set(TangoMap.pairKey(k.r1, k.c1, k.r2, k.c2), k.type);
    }
    return map;
  }

  cellAt(row, col) {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return undefined;
    return this.cells[row * this.size + col];
  }

  toGrid() {
    const grid = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    for (const cell of this.cells) grid[cell.row][cell.col] = cell.value;
    return grid;
  }

  // '=' , 'x' or null for the link between two orthogonal neighbours.
  linkBetween(r1, c1, r2, c2) {
    return this._index.get(TangoMap.pairKey(r1, c1, r2, c2)) ?? null;
  }
}
