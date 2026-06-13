class BranchAndBoundMethod {
  constructor() {
    this.name = 'Branch and Bound';
  }

  makeNextMove(resolution) {
    const currentCell = resolution.path[resolution.path.length - 1];
    resolution.map.populateValidMoves(currentCell);
    const nextNodeValue = (resolution.map.getLastVisitedNode()?.value ?? 0) + 1;
    if (!resolution.map.isSolvable() || !resolution.map.canReachNode(currentCell, nextNodeValue)) {
      resolution.backStep();
      return;
    }
    const nextMove = currentCell.validMoves?.find((move) => !move.visited);
    if (nextMove) {
      resolution.addStep(nextMove.cell);
      nextMove.visited = true;
    } else {
      resolution.backStep();
    }
  }
}
