import type { Resolution } from "../models/Resolution";
import type { SolveMethod } from "./SolveMethod";
import { BacktrackingMethod } from "./methods/BacktrackingMethod";
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
  method: SolveMethod;

  constructor(method: SolveMethod = new BacktrackingMethod()) {
    this.method = method;
  }

  async solve(resolution: Resolution, shouldStop?: () => boolean, getSps?: () => number): Promise<void> {
    const startTime = performance.now();
    resolution.reset();

    const first = resolution.map.getFirstCell();
    if (!first) return;

    // re-rendering the whole grid on every single move would slow the search down,
    // so the UI is only repainted when we hand control back to the browser
    const render = resolution.onChange;
    resolution.onChange = undefined;

    let iterations = 0;
    try {
      resolution.addStep(first);

      let lastFrame = performance.now();
      while (!resolution.isCompleted()) {
        if (shouldStop?.()) break;
        if (resolution.path.length === 0) break; // search space exhausted: no solution from the start

        const sps = getSps?.() ?? SPS_UNLIMITED;
        if (sps <= SPS_PAUSED) {
          // hold the search still, but keep yielding so the UI stays responsive
          render?.();
          await nextFrame();
          await delay(100);
          continue;
        }

        this.method.makeNextMove(resolution);
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

    console.log(`Solver (${this.method.name}) finished in ${(performance.now() - startTime).toFixed(2)} ms with ${iterations} iterations.`);
  }
}
