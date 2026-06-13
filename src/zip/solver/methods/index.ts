import type { SolveMethod } from "../SolveMethod";
import { BacktrackingMethod } from "./BacktrackingMethod";
import { BranchAndBoundMethod } from "./BranchAndBoundMethod";

export { BacktrackingMethod } from "./BacktrackingMethod";
export { BranchAndBoundMethod } from "./BranchAndBoundMethod";

export const SOLVE_METHODS: SolveMethod[] = [new BacktrackingMethod(), new BranchAndBoundMethod()];
