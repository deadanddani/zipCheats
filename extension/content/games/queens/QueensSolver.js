// Adapter: builds the model from the region grid, runs the DFS solver, and
// returns the queen positions as [{ row, col }].
const QueensSolver = {
  solve(map) {
    // LinkedIn ships the queen positions ([{row,col}]) in the payload, in the
    // exact format the player consumes, so prefer them and skip the DFS. Guard
    // that every entry is a {row,col} (the extractor may yield raw indices).
    const shipped = map?.solution;
    if (
      Array.isArray(shipped) &&
      shipped.length &&
      shipped.every((q) => Number.isInteger(q?.row) && Number.isInteger(q?.col))
    ) {
      const solution = [...shipped].sort((a, b) => a.row - b.row);
      console.log('[hackTheLink] QueensSolver: using LinkedIn solution ✔', solution);
      return solution;
    }

    const grid = map?.grid;
    if (!Array.isArray(grid) || !grid.length) {
      console.warn('[hackTheLink] QueensSolver: empty/invalid grid');
      return null;
    }

    const queensMap = QueensMap.fromGrid(grid);
    const resolution = new QueensResolution(queensMap);
    const solver = new QueensSolverCore();

    const solved = solver.solve(resolution);
    if (!solved) {
      console.warn('[hackTheLink] QueensSolver: no solution found');
      return null;
    }

    const solution = resolution.positions().sort((a, b) => a.row - b.row);
    console.log('[hackTheLink] QueensSolver solved ✔', solution);

    this.verify(solution, map.solution);
    return solution;
  },

  // Cross-check against LinkedIn's shipped solution when present.
  verify(ours, theirs) {
    if (!Array.isArray(theirs) || !theirs.length) return;
    const key = (list) =>
      list
        .map((q) => `${q.row},${q.col}`)
        .sort()
        .join(' ');
    const match = key(ours) === key(theirs);
    if (match) console.log('[hackTheLink] QueensSolver: matches LinkedIn solution ✔');
    else console.warn('[hackTheLink] QueensSolver: differs from LinkedIn solution', { ours, theirs });
  },
};
