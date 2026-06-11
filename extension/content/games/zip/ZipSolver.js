// Adapter between the content script and the object model. Takes the grid that
// ZipExtractor produces and returns the solution as an ordered list of cell
// indices (idx = row * cols + col), ready to be replayed onto the board.
// Internally it builds a ZipMap / Resolution and runs the Solver with the
// BranchAndBoundMethod.
const ZipSolver = {
  // grid: Cell[][] with { row, col, value: number|null, walls: {top,right,bottom,left} }
  // returns: number[] of cell indices in path order, or null if unsolvable.
  solve(grid) {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return null;

    // Build cells as the model expects them (adds the `visited` flag).
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const src = grid[row][col];
        cells.push({
          row,
          col,
          value: src.value ?? null,
          visited: false,
          walls: {
            top: !!src.walls?.top,
            right: !!src.walls?.right,
            bottom: !!src.walls?.bottom,
            left: !!src.walls?.left,
          },
        });
      }
    }

    const map = new ZipMap(rows, cols, cells);
    const resolution = new Resolution(map);
    const solver = new Solver(new BranchAndBoundMethod());

    const solved = solver.solve(resolution);
    if (!solved) return null;

    return resolution.path.map((cell) => cell.row * cols + cell.col);
  },
};
