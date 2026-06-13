// Adapter: builds the model from the grid + constraints, runs the backtracking
// solver, and returns the fully solved grid (2D array of 1=Sun / 2=Moon) so
// TangoBoardView can paint it and TangoPlayer can replay it.
const TangoSolver = {
  solve(map) {
    // LinkedIn ships the full solved grid in the payload, so prefer it directly.
    if (Array.isArray(map?.solution) && map.solution.length) {
      console.log('[hackTheLink] TangoSolver: using LinkedIn solution ✔', map.solution);
      return map.solution;
    }

    // Fallback (e.g. the mock board carries no solution): solve from givens.
    const grid = map?.grid;
    if (!Array.isArray(grid) || !grid.length) {
      console.warn('[hackTheLink] TangoSolver: empty/invalid grid');
      return null;
    }

    const tangoMap = TangoMap.fromGrid(grid, map.constraints ?? []);
    const solution = new TangoSolverCore(tangoMap).solve();
    if (!solution) {
      console.warn('[hackTheLink] TangoSolver: no solution found');
      return null;
    }

    console.log('[hackTheLink] TangoSolver solved ✔', solution);
    return solution;
  },
};
