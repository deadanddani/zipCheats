// Adapter: builds the model from the digit grid, runs the DFS solver, and
// returns the fully solved grid (2D array of digits) so SudokuBoardView can paint
// the answer and SudokuPlayer can type it in.
const SudokuSolver = {
  solve(map) {
    // LinkedIn ships the full solved grid in the payload, so prefer it directly.
    if (Array.isArray(map?.solution) && map.solution.length) {
      console.log('[hackTheLink] SudokuSolver: using LinkedIn solution ✔', map.solution);
      return map.solution;
    }

    // Fallback (e.g. the mock board carries no solution): solve from givens.
    const grid = map?.grid;
    if (!Array.isArray(grid) || !grid.length) {
      console.warn('[hackTheLink] SudokuSolver: empty/invalid grid');
      return null;
    }

    const sudokuMap = SudokuMap.fromGrid(grid);
    const resolution = new SudokuResolution(sudokuMap);
    const solver = new SudokuSolverCore();

    const solved = solver.solve(resolution);
    if (!solved) {
      console.warn('[hackTheLink] SudokuSolver: no solution found');
      return null;
    }

    const solution = sudokuMap.toGrid();
    console.log('[hackTheLink] SudokuSolver solved ✔', solution);
    return solution;
  },
};
