// the solver speed is expressed directly in steps per second (sps), so the UI
// can show a concrete, meaningful number instead of an abstract 0-100 scale.
// the slider walks these discrete stops, bottom to top:
//   0        -> paused (the search holds still)
//   0.25..1000 -> that many moves per second
//   Infinity -> no artificial delay (as fast as the browser allows)
export const SPS_STOPS = [0, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, Infinity];

export const SPS_PAUSED = 0;
export const SPS_UNLIMITED = Infinity;

// default to the fastest setting so a normal solve isn't slowed down unless the
// user deliberately dials it back to watch (or pause) the search.
export const SPS_DEFAULT_INDEX = SPS_STOPS.length - 1;

// delay (in ms) the solver waits after each move to hit the requested rate.
export function spsToDelayMs(sps: number): number {
  return sps === SPS_UNLIMITED ? 0 : 1000 / sps;
}
