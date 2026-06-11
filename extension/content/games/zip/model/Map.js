// The Zip board model. A "Cell" is a plain object:
// { row, col, value, visited, validMoves?, walls }.

const ZIP_OPPOSITE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
const ZIP_OFFSET = { top: [-1, 0], right: [0, 1], bottom: [1, 0], left: [0, -1] };

class ZipMap {
  constructor(rows, cols, cells) {
    this.rows = rows;
    this.cols = cols;
    this.cells = cells ?? ZipMap.emptyCells(rows, cols);
  }

  static emptyCells(rows, cols) {
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({ row, col, value: null, visited: false, walls: { top: false, right: false, bottom: false, left: false } });
      }
    }
    return cells;
  }

  static fromGrid(grid) {
    return new ZipMap(grid.length, grid[0]?.length ?? 0, grid.flat());
  }

  cellAt(row, col) {
    return this.cells.find((cell) => cell.row === row && cell.col === col);
  }

  getFirstCell() {
    return this.cells.find((cell) => cell.value === 1);
  }

  getNode(value) {
    return this.cells.find((cell) => cell.value === value);
  }

  getLastVisitedNode() {
    // get the visited cell with the highest value from the map
    let lastNode = undefined;
    for (const cell of this.cells) {
      if (cell.visited && cell.value !== null && (lastNode === undefined || cell.value > lastNode.value)) {
        lastNode = cell;
      }
    }
    return lastNode;
  }

  addWall(row, col, side) {
    const cell = this.cellAt(row, col);
    if (!cell) return;
    cell.walls[side] = true;

    const [dr, dc] = ZIP_OFFSET[side];
    const neighbor = this.cellAt(row + dr, col + dc);
    if (neighbor) neighbor.walls[ZIP_OPPOSITE[side]] = true;
  }

  isValidMove(a, b) {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false;

    if (this.hasWallBetween(a, b)) return false;

    if (b.value !== null && b.value > 1 && !this.getNode(b.value - 1)?.visited) return false;

    return true;
  }

  populateValidMoves(cell) {
    if (cell.validMoves !== undefined) return;

    const neighbors = this.getNeighbors(cell).filter((neighbor) => this.isValidMove(cell, neighbor));

    cell.validMoves = neighbors.map((neighbor) => ({ cell: neighbor, visited: neighbor.visited }));
  }

  hasWallBetween(a, b) {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    const side = dr === -1 ? 'top' : dr === 1 ? 'bottom' : dc === -1 ? 'left' : 'right';
    return a.walls[side] || b.walls[ZIP_OPPOSITE[side]];
  }

  getNeighbors(cell) {
    return Object.keys(ZIP_OFFSET)
      .map((side) => {
        const [dr, dc] = ZIP_OFFSET[side];
        return this.cellAt(cell.row + dr, cell.col + dc);
      })
      .filter((neighbor) => neighbor !== undefined);
  }

  isSolvable() {
    const nonVisitedCells = this.cells.filter((cell) => !cell.visited);
    if (nonVisitedCells.length === 0) return true;

    const joinedCells = [];
    this.getCellGroup(nonVisitedCells[0], joinedCells);

    return joinedCells.length === nonVisitedCells.length;
  }

  getCellGroup(cell, currentCellGroup) {
    currentCellGroup.push(cell);

    for (const neighbor of this.getNeighbors(cell)) {
      if (!neighbor.visited && !this.hasWallBetween(cell, neighbor) && !currentCellGroup.includes(neighbor)) {
        this.getCellGroup(neighbor, currentCellGroup);
      }
    }
  }

  canReachNode(start, targetValue) {
    const currentCellGroup = [];
    this.getCellGroupStopOnNodes(start, currentCellGroup);
    return currentCellGroup.some((cell) => cell.value === targetValue);
  }

  getCellGroupStopOnNodes(cell, currentCellGroup) {
    currentCellGroup.push(cell);

    for (const neighbor of this.getNeighbors(cell)) {
      if (!neighbor.visited && !this.hasWallBetween(cell, neighbor) && !currentCellGroup.includes(neighbor) && neighbor.value === null) {
        this.getCellGroupStopOnNodes(neighbor, currentCellGroup);
      } else if (neighbor.value !== null && !this.hasWallBetween(cell, neighbor) && !currentCellGroup.includes(neighbor)) {
        currentCellGroup.push(neighbor);
      }
    }
  }
}
