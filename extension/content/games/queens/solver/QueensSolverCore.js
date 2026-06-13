// Depth-first search that, at each step, fills the empty region with the fewest
// valid cells (most-constrained first) and backtracks on dead ends. Ported from
// src/queens/solver/Solver.ts, but synchronous (the dev app sliced the work
// across animation frames only so the board could be watched solving live).
class QueensSolverCore {
  // Returns true if `resolution` ends on a complete, valid board.
  solve(resolution, timeBudgetMs = 10000) {
    const startTime = performance.now();
    resolution.reset();

    const deadline = startTime + timeBudgetMs;

    // For each depth, the cells we've already tried placing a queen on, so that
    // on backtrack we move to a different candidate instead of re-placing it.
    const tried = [];

    let iterations = 0;
    while (!resolution.isCompleted()) {
      if (resolution.queens.length === 0 && this.rootExhausted(resolution, tried)) {
        break; // every option at the root tried: no solution exists
      }
      if (performance.now() > deadline) {
        console.warn(`[hackTheLink] Queens solver timed out after ${timeBudgetMs} ms`);
        return false;
      }

      this.makeNextMove(resolution, tried);
      iterations++;
    }

    const solved = resolution.isCompleted();
    console.log(`[hackTheLink] Queens solver finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
    return solved;
  }

  // Advances the search by exactly one placement or one backtrack.
  makeNextMove(resolution, tried) {
    const depth = resolution.queens.length;

    // A region left with no room means this branch is dead — undo and retry.
    if (!resolution.map.isSolvable()) {
      this.backtrack(resolution, tried);
      return;
    }

    const region = this.mostConstrainedRegion(resolution);
    if (region === null) {
      this.backtrack(resolution, tried);
      return;
    }

    const triedHere = tried[depth] ?? (tried[depth] = new Set());
    const candidate = resolution.map.getValidCells(region).find((cell) => !triedHere.has(cell));
    if (!candidate) {
      this.backtrack(resolution, tried);
      return;
    }

    triedHere.add(candidate);
    resolution.placeQueen(candidate);
  }

  // Removes the last queen and forgets the choices made below that depth.
  backtrack(resolution, tried) {
    const depth = resolution.queens.length;
    tried.length = depth; // anything tried deeper is no longer reachable
    resolution.removeLast();
  }

  // Empty region (no queen yet) with the fewest cells still available, or null.
  mostConstrainedRegion(resolution) {
    const { map } = resolution;
    let best = null;
    let fewest = Infinity;
    for (const region of map.getRegionsWithoutQueens()) {
      const available = map.getValidCells(region).length;
      if (available < fewest) {
        fewest = available;
        best = region;
      }
    }
    return best;
  }

  // True when, back at the root, every candidate of the chosen region was tried.
  rootExhausted(resolution, tried) {
    const triedHere = tried[0];
    if (!triedHere) return false; // haven't even started the first region yet
    const region = this.mostConstrainedRegion(resolution);
    if (region === null) return true;
    return resolution.map.getValidCells(region).every((cell) => triedHere.has(cell));
  }
}
