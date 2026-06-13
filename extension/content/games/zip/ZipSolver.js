// Adapter from the extractor's grid to the solver: returns the solution as cell
// indices (idx = row * cols + col) in path order, or null if unsolvable.
const ZipSolver = {
  solve(map) {
    const grid = map.grid;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return null;

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

    const zipMap = new ZipMap(rows, cols, cells);
    const resolution = new Resolution(zipMap);
    const solver = new Solver(new BranchAndBoundMethod());

    const solved = solver.solve(resolution);
    if (!solved) return null;

    return resolution.path.map((cell) => cell.row * cols + cell.col);
  },
};
