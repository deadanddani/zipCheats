import type { Resolution } from "../models/Resolution";

export interface SolveMethod {
  readonly name: string;

  makeNextMove(resolution: Resolution): void;
}
