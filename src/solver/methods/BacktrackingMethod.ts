import { Cell } from "../../models/Cell";
import type { Resolution } from "../../models/Resolution";
import type { SolveMethod } from "../SolveMethod";

/** Plain depth-first search: tries moves in order and backtracks on dead ends. */
export class BacktrackingMethod implements SolveMethod {
  readonly name = "Backtracking";

  makeNextMove(resolution: Resolution): void {
    const currentCell: Cell = resolution.path[resolution.path.length - 1];
    resolution.map.populateValidMoves(currentCell);
    const nextMove = currentCell.validMoves?.find((move) => !move.visited);
    if (nextMove) {
      resolution.addStep(nextMove.cell);
      nextMove.visited = true;
    } else {
      resolution.backStep();
    }
  }
}
