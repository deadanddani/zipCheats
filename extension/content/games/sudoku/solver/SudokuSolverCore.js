// Depth-first search that, at each step, fills the empty cell with the fewest
// candidate digits (most-constrained first) and backtracks on dead ends. Ported
// from src/sudoku/solver/Solver.ts, but synchronous (the dev app sliced the work
// across animation frames only so the board could be watched solving live).
class SudokuSolverCore {
  // Returns true if `resolution` ends on a complete, valid board.
  solve(resolution, timeBudgetMs = 10000) {
    const startTime = performance.now();
    resolution.reset();

    const deadline = startTime + timeBudgetMs;
    const placed = [];
    const tried = [];

    let iterations = 0;
    while (!resolution.isCompleted()) {
      if (placed.length === 0 && this.rootExhausted(resolution, tried)) {
        break; // every digit at the root has been tried: no solution exists
      }
      if (performance.now() > deadline) {
        console.warn(`[hackTheLink] Sudoku solver timed out after ${timeBudgetMs} ms`);
        return false;
      }

      this.makeNextMove(resolution, placed, tried);
      iterations++;
    }

    const solved = resolution.isCompleted();
    console.log(`[hackTheLink] Sudoku solver finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
    return solved;
  }

  // Advances the search by exactly one placement or one backtrack.
  makeNextMove(resolution, placed, tried) {
    const cell = resolution.map.mostConstrainedEmpty();
    if (!cell) return; // board is full — the outer loop will see it's completed

    const depth = placed.length;
    const triedHere = tried[depth] ?? (tried[depth] = new Set());
    const candidate = resolution.map.candidates(cell).find((value) => !triedHere.has(value));
    if (candidate === undefined) {
      this.backtrack(resolution, placed, tried);
      return;
    }

    triedHere.add(candidate);
    resolution.setValue(cell, candidate);
    placed.push(cell);
  }

  // Removes the last digit and forgets the choices made below that depth.
  backtrack(resolution, placed, tried) {
    const depth = placed.length;
    tried.length = depth;
    const cell = placed.pop();
    if (cell) resolution.clearValue(cell);
  }

  // True when, back at the root, every digit of the first cell was tried.
  rootExhausted(resolution, tried) {
    const triedHere = tried[0];
    if (!triedHere) return false;
    const cell = resolution.map.mostConstrainedEmpty();
    if (!cell) return true;
    return resolution.map.candidates(cell).every((value) => triedHere.has(value));
  }
}
