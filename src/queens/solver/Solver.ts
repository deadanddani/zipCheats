import type { QueenCell } from "../models/Cell";
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
   * empty region with the fewest valid cells (most-constrained first) and
   * backtracks on dead ends. Mirrors the Zip solver: the work is sliced across
   * frames so the board can be watched updating, and the pace is driven by
   * `getSps` (steps per second) so the user can slow it down or pause.
   */
  async solve(resolution: Resolution, shouldStop?: () => boolean, getSps?: () => number): Promise<void> {
    const startTime = performance.now();
    resolution.reset();

    // re-rendering the whole board on every single move would slow the search down,
    // so the UI is only repainted when we hand control back to the browser
    const render = resolution.onChange;
    resolution.onChange = undefined;

    // for each depth, the cells we've already tried placing a queen on, so that
    // when we backtrack to it we move on to a different candidate instead of
    // re-placing the same one forever
    const tried: Set<QueenCell>[] = [];

    let iterations = 0;
    try {
      let lastFrame = performance.now();
      while (!resolution.isCompleted()) {
        if (shouldStop?.()) break;
        if (resolution.queens.length === 0 && this.rootExhausted(resolution, tried)) {
          break; // every option at the root has been tried: no solution exists
        }

        const sps = getSps?.() ?? SPS_UNLIMITED;
        if (sps <= SPS_PAUSED) {
          // hold the search still, but keep yielding so the UI stays responsive
          render?.();
          await nextFrame();
          await delay(100);
          continue;
        }

        this.makeNextMove(resolution, tried);
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

    console.log(`Queens solver finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
  }

  /** Advances the search by exactly one placement or one backtrack. */
  private makeNextMove(resolution: Resolution, tried: Set<QueenCell>[]): void {
    const depth = resolution.queens.length;

    // a region left with no room (a queen can't be placed anywhere) means this
    // branch is dead - undo the last placement and try the next candidate
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

  /** Removes the last queen and forgets the choices made below that depth. */
  private backtrack(resolution: Resolution, tried: Set<QueenCell>[]): void {
    const depth = resolution.queens.length;
    tried.length = depth; // anything tried deeper is no longer reachable
    resolution.removeLast();
  }

  /** Empty region (no queen yet) with the fewest cells still available, or null. */
  private mostConstrainedRegion(resolution: Resolution): number | null {
    const { map } = resolution;
    let best: number | null = null;
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

  /** True when, back at the root, every candidate of the chosen region was tried. */
  private rootExhausted(resolution: Resolution, tried: Set<QueenCell>[]): boolean {
    const triedHere = tried[0];
    if (!triedHere) return false; // haven't even started the first region yet
    const region = this.mostConstrainedRegion(resolution);
    if (region === null) return true;
    return resolution.map.getValidCells(region).every((cell) => triedHere.has(cell));
  }
}
