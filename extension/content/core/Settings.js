// Shared settings in chrome.storage.local. completeMap defaults off so the
// player stops one move short and never finishes the puzzle until you opt in.
const Settings = {
  // Default target completion time (seconds) used for a game with no explicit
  // value. 0 is allowed but risky: LinkedIn's board can crash if completed
  // instantly, which the UI flags in red.
  DEFAULT_SOLVE_SECONDS: 1,

  DEFAULTS: {
    completeMap: false,
    // Per-game target completion time in whole seconds, keyed by game id.
    // e.g. { zip: 5 }. Missing entries fall back to DEFAULT_SOLVE_SECONDS.
    solveSeconds: {},
  },

  async get() {
    const stored = await chrome.storage.local.get(this.DEFAULTS)
    return { ...this.DEFAULTS, ...stored }
  },

  async set(patch) {
    await chrome.storage.local.set(patch)
  },

  // Target completion time for one game, normalised to a non-negative integer.
  async getSolveSeconds(gameId) {
    const { solveSeconds } = await this.get()
    const v = solveSeconds?.[gameId]
    return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : this.DEFAULT_SOLVE_SECONDS
  },

  async setSolveSeconds(gameId, seconds) {
    const { solveSeconds } = await this.get()
    const v = Math.max(0, Math.floor(Number(seconds) || 0))
    await this.set({ solveSeconds: { ...solveSeconds, [gameId]: v } })
  },
}
