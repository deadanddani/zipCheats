// Queens board model. Square grid of colored regions; goal is one crown per row,
// column and region, with no two crowns touching. A cell is a plain object:
// { row, col, region, queen, blocked, checked }. Prefixed `Queens*` to avoid
// clashing with Zip's globals in the shared content-script scope.

// King-move directions: two queens may not touch, including diagonally.
const QUEENS_TOUCHING = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function createQueenCells(regions) {
  const cells = [];
  for (let row = 0; row < regions.length; row++) {
    for (let col = 0; col < regions[row].length; col++) {
      cells.push({ row, col, region: regions[row][col], queen: false, blocked: false, checked: false });
    }
  }
  return cells;
}

class QueensMap {
  constructor(size, cells) {
    this.size = size;
    this.cells = cells ?? createQueenCells(QueensMap.emptyRegions(size));
    this.regionCount = new Set(this.cells.map((cell) => cell.region)).size;
  }

  static emptyRegions(size) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  }

  static fromGrid(regions) {
    return new QueensMap(regions.length, createQueenCells(regions));
  }

  cellAt(row, col) {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return undefined;
    return this.cells[row * this.size + col];
  }

  regionCells(region) {
    return this.cells.filter((cell) => cell.region === region);
  }

  touching(cell) {
    return QUEENS_TOUCHING
      .map(([dr, dc]) => this.cellAt(cell.row + dr, cell.col + dc))
      .filter((neighbor) => neighbor !== undefined);
  }

  // Every cell that a crown on `cell` would rule out: same row, same column,
  // same region, and the 8 touching neighbours.
  conflictsFor(cell) {
    const set = new Set();
    for (let i = 0; i < this.size; i++) {
      const inRow = this.cellAt(cell.row, i);
      const inCol = this.cellAt(i, cell.col);
      if (inRow) set.add(inRow);
      if (inCol) set.add(inCol);
    }
    for (const same of this.regionCells(cell.region)) set.add(same);
    for (const neighbor of this.touching(cell)) set.add(neighbor);
    set.delete(cell);
    return [...set];
  }

  getValidCells(region) {
    return this.cells.filter((cell) => cell.region === region && !cell.queen && !cell.blocked);
  }

  getAllRegions() {
    return new Set(this.cells.map((cell) => cell.region));
  }

  getRegionsWithoutQueens() {
    const regionsWithQueens = new Set(this.cells.filter((cell) => cell.queen).map((cell) => cell.region));
    const regionsWithoutQueens = new Set(this.cells.map((cell) => cell.region));
    for (const region of regionsWithQueens) regionsWithoutQueens.delete(region);
    return regionsWithoutQueens;
  }

  // Dead end if any region still missing a crown has no room left for one.
  isSolvable() {
    for (const region of this.getRegionsWithoutQueens()) {
      if (this.getValidCells(region).length === 0) return false;
    }
    return true;
  }
}
