import type { SudokuCell } from "../models/Cell";
import type { Resolution } from "../models/Resolution";
import { SPS_PAUSED, SPS_UNLIMITED, spsToDelayMs } from "./SolverSpeed";

// only hand control back to the browser (so it can paint) once this much time has passed,
// instead of after every move - the search keeps running at full speed in between
const MAX_MS_BETWEEN_FRAMES = 16;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Solver {
  /**
   * Solves the board with a depth-first search that, at each step, fills the
   * empty cell with the fewest candidate digits (most-constrained first) and
   * backtracks on dead ends. Mirrors the Queens solver: the work is sliced
   * across frames so the board can be watched updating, and the pace is driven
   * by `getSps` (steps per second) so the user can slow it down or pause.
   *
   * ⚠️ WIP: a single backtracking method is wired here as the test resolver.
   */
  async solve(resolution: Resolution, shouldStop?: () => boolean, getSps?: () => number): Promise<void> {
    const startTime = performance.now();
    resolution.reset();

    // re-rendering the whole board on every single move would slow the search down,
    // so the UI is only repainted when we hand control back to the browser
    const render = resolution.onChange;
    resolution.onChange = undefined;

    // the cells we've filled so far (a stack we can unwind), and for each depth
    // the digits we've already tried there, so backtracking moves on to a new
    // candidate instead of re-placing the same one forever
    const placed: SudokuCell[] = [];
    const tried: Set<number>[] = [];

    let iterations = 0;
    try {
      let lastFrame = performance.now();
      while (!resolution.isCompleted()) {
        if (shouldStop?.()) break;
        if (placed.length === 0 && this.rootExhausted(resolution, tried)) {
          break; // every digit at the root has been tried: no solution exists
        }

        const sps = getSps?.() ?? SPS_UNLIMITED;
        if (sps <= SPS_PAUSED) {
          // hold the search still, but keep yielding so the UI stays responsive
          render?.();
          await nextFrame();
          await delay(100);
          continue;
        }

        this.makeNextMove(resolution, placed, tried);
        iterations++;

        if (sps === SPS_UNLIMITED) {
          const now = performance.now();
          if (now - lastFrame >= MAX_MS_BETWEEN_FRAMES) {
            render?.();
            await nextFrame();
            lastFrame = performance.now();
          }
        } else {
          render?.();
          await nextFrame();
          await delay(spsToDelayMs(sps));
          lastFrame = performance.now();
        }
      }
    } finally {
      resolution.onChange = render;
      render?.();
    }

    console.log(`Sudoku solver finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
  }

  /** Advances the search by exactly one placement or one backtrack. */
  private makeNextMove(resolution: Resolution, placed: SudokuCell[], tried: Set<number>[]): void {
    const cell = resolution.map.mostConstrainedEmpty();
    if (!cell) return; // board is full — the outer loop will see it's completed

    const depth = placed.length;
    const triedHere = tried[depth] ?? (tried[depth] = new Set());
    const candidate = resolution.map.candidates(cell).find((value) => !triedHere.has(value));
    if (candidate === undefined) {
      // this cell has no untried legal digit left: dead end, unwind one step
      this.backtrack(resolution, placed, tried);
      return;
    }

    triedHere.add(candidate);
    resolution.setValue(cell, candidate);
    placed.push(cell);
  }

  /** Removes the last digit and forgets the choices made below that depth. */
  private backtrack(resolution: Resolution, placed: SudokuCell[], tried: Set<number>[]): void {
    const depth = placed.length;
    tried.length = depth; // anything tried deeper is no longer reachable
    const cell = placed.pop();
    if (cell) resolution.clearValue(cell);
  }

  /** True when, back at the root, every digit of the first cell was tried. */
  private rootExhausted(resolution: Resolution, tried: Set<number>[]): boolean {
    const triedHere = tried[0];
    if (!triedHere) return false; // haven't even started the first cell yet
    const cell = resolution.map.mostConstrainedEmpty();
    if (!cell) return true;
    return resolution.map.candidates(cell).every((value) => triedHere.has(value));
  }
}
