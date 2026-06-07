import { Cell, Move } from "../models/Cell";
import type { Resolution } from "../models/Resolution";

const MAX_ITERATIONS = 500_000;

export class Solver {
  //measure the time it takes to solve a map

  solve(resolution: Resolution): void {
    const startTime = performance.now();
    resolution.reset();

    const first = resolution.map.getFirstCell();
    if (!first) return;

    resolution.addStep(first);

    let iterations = 0;
    while (!resolution.isCompleted() && iterations < MAX_ITERATIONS) {
      this.makeNextMove(resolution);
      iterations++;
      console.log(`Solving... ${((iterations / MAX_ITERATIONS) * 100).toFixed(2)}%`);
    }

    console.log(`Solver finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
  }

  makeNextMove(resolution: Resolution): void {
    const currentCell: Cell = resolution.path[resolution.path.length - 1];
    resolution.map.populateValidMoves(currentCell);
    const nextMove = currentCell.validMoves?.find((move) => !move.visited);
    if (nextMove) {
      resolution.addStep(nextMove?.cell);
      nextMove.visited = true;
    } else {
      resolution.backStep();
    }
  }
}
