// Adapter from the extractor's grid to the solver: returns the solution as cell
// indices (idx = row * cols + col) in path order, or null if unsolvable.
const ZipSolver = {
  solve(map) {
    // LinkedIn ships the full solved path (cell indices) in the payload, in the
    // exact format we'd return, so prefer it and skip the branch-and-bound.
    if (Array.isArray(map?.solution) && map.solution.length) {
      console.log("[hackTheLink] ZipSolver: using LinkedIn solution ✔");
      return map.solution;
    }

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
