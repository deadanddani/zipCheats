class Solver {
  constructor(method = new BranchAndBoundMethod()) {
    this.method = method;
  }

  solve(resolution, timeBudgetMs = 10000) {
    const startTime = performance.now();
    resolution.reset();

    const first = resolution.map.getFirstCell();
    if (!first) return false;

    const deadline = startTime + timeBudgetMs;

    let iterations = 0;
    resolution.addStep(first);

    while (!resolution.isCompleted()) {
      if (resolution.path.length === 0) break; // search space exhausted: no solution from the start
      if (performance.now() > deadline) {
        console.warn(`[hackTheLink] Solver (${this.method.name}) timed out after ${timeBudgetMs} ms`);
        return false;
      }

      this.method.makeNextMove(resolution);
      iterations++;
    }

    const solved = resolution.isCompleted();
    console.log(
      `[hackTheLink] Solver (${this.method.name}) finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`,
    );
    return solved;
  }
}
