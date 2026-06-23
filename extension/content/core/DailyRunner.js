// Drives a "solve all dailies" run: walks through every game with
// canAutoSolve !== false, in catalog order, solving each one (or skipping it if
// it's already solved) and then navigating the tab to the next game. The whole
// run state lives in chrome.storage.local so it survives the full-page reloads
// that happen as we move between games — each freshly-loaded content script
// reads the state and continues where the previous page left off.
//
// Status per game: 'pending' | 'solving' | 'done' | 'skipped' | 'error'.
const DailyRunner = {
  KEY: 'htlDaily',
  // Floor so we never complete at ~0s, which can crash LinkedIn's board.
  MIN_SECONDS: 0,
  // Let a finished solve register/persist before navigating away.
  SETTLE_MS: 3000,
  // The dailies flow navigates with this query param so the content script can
  // tell a run-driven page load apart from a normal one (see main.js isDailyRun).
  PARAM: 'hackTheLink=2',

  // The URL to navigate to for a game as part of a run.
  urlFor(game) {
    return `${game.url}?${this.PARAM}`
  },

  // The list of game ids that take part in a run, in order.
  order() {
    return GameCatalog.games.filter((g) => g.canAutoSolve !== false).map((g) => g.id)
  },

  async read() {
    const { [this.KEY]: state } = await chrome.storage.local.get(this.KEY)
    return state ?? null
  },

  async write(state) {
    await chrome.storage.local.set({ [this.KEY]: state })
  },

  // Build initial state and persist it. Caller then navigates to the first game.
  async start({ seconds, useGameTime }) {
    const order = this.order()
    const statuses = Object.fromEntries(order.map((id) => [id, 'pending']))
    const state = {
      active: true,
      finished: false,
      order,
      index: 0,
      startedAt: Date.now(),
      seconds: Math.max(0, Math.floor(Number(seconds) || 0)),
      useGameTime: !!useGameTime,
      statuses,
      errors: {},
    }
    await this.write(state)
    return state
  },

  async cancel() {
    await chrome.storage.local.remove(this.KEY)
  },

  expectedId(state) {
    return state.order[state.index] ?? null
  },

  // Target seconds for the game currently being solved (null = use game time).
  targetSeconds(state) {
    return state.useGameTime ? null : Math.max(this.MIN_SECONDS, state.seconds)
  },

  // Record the outcome of the current game and move to the next one. Navigates
  // to the next game's URL, or finishes the run when there are none left.
  async advance(status, error) {
    const state = await this.read()
    if (!state?.active || state.finished) return
    const id = this.expectedId(state)
    if (id) {
      state.statuses[id] = status
      if (error) state.errors[id] = String(error)
    }
    state.index += 1

    if (state.index >= state.order.length) {
      state.finished = true
      state.finishedAt = Date.now()
      // The run is over: drop active so it stops gating page loads. The overlay
      // still renders the summary (finished) until the user dismisses it.
      state.active = false
      await this.write(state)
      DailyOverlay.render(state)
      return
    }

    await this.write(state)
    DailyOverlay.render(state)
    const next = GameCatalog.byId(state.order[state.index])
    if (next) setTimeout(() => (location.href = this.urlFor(next)), this.SETTLE_MS)
  },

  // Navigate to the game we're supposed to be on (used when a reload lands us
  // somewhere else, when the param is missing, or to start the very first game).
  gotoExpected(state) {
    const next = GameCatalog.byId(this.expectedId(state))
    if (!next) return
    const onDailyUrl = location.href.startsWith(next.url) && new URL(location.href).searchParams.get('hackTheLink') === '2'
    if (!onDailyUrl) location.href = this.urlFor(next)
  },
}
