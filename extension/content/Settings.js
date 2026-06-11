// Shared settings, persisted in chrome.storage.local so the popup and the
// content script see the same values. Defaults are chosen to be safe for
// testing: completeMap is off, so the solver replays up to one move before the
// end and never actually finishes the puzzle until you opt in.
const Settings = {
  DEFAULTS: {
    completeMap: false,
  },

  async get() {
    const stored = await chrome.storage.local.get(this.DEFAULTS)
    return { ...this.DEFAULTS, ...stored }
  },

  async set(patch) {
    await chrome.storage.local.set(patch)
  },
}
