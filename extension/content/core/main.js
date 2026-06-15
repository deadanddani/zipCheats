let game = null
let lastMap = null
let solutionPromise = null
let pendingWait = null // cancels the in-flight waitForElement poll on navigation
let dailyState = null // cached "solve all dailies" run state, refreshed per route
let dailyWatchdog = null // fails the current daily game if its board never loads
// LinkedIn's timer starts at puzzle load, which is ~when the board element
// appears (onMapReady). We anchor here — base = seconds already on the clock
// (non-zero only when resuming a puzzle), at = our wall-clock reference — so the
// player can extrapolate the live elapsed time without scraping the DOM.
let elapsedAnchor = null

function autoRunRequested() {
  return new URL(location.href).searchParams.get('hackTheLink') === '1'
}

// Solve eagerly so the answer is ready before the user clicks "Solve".
function computeSolution(map) {
  return Promise.resolve().then(() => {
    const t0 = performance.now()
    const solution = game.solver.solve(map)
    const ms = (performance.now() - t0).toFixed(2)
    if (!solution) console.warn(`[hackTheLink] No solution found (${ms} ms)`)
    else console.log(`[hackTheLink] Solved in ${ms} ms — ${solution.length} cells`)
    return solution
  })
}

// overrides lets the daily runner force completion and skip the per-game time.
async function applySolution(overrides = {}) {
  if (game.canAutoSolve === false) {
    console.warn(`[hackTheLink] ${game.name}: auto-solve is disabled`)
    return { ok: false, error: 'autosolve-disabled' }
  }

  if (!solutionPromise) {
    console.warn('[hackTheLink] No map extracted yet')
    return { ok: false, error: 'no-map' }
  }

  const solution = await solutionPromise
  if (!solution) return { ok: false, error: 'no-solution' }

  const completeMap = overrides.completeMap ?? (await Settings.get()).completeMap
  const solveSeconds = overrides.solveSeconds ?? (await Settings.getSolveSeconds(game.id))
  await game.player.play(solution, {
    completeMap,
    map: lastMap,
    solveSeconds,
    elapsedAnchor,
    timerStartsOnClick: game.timerStartsOnClick ?? false,
  })
  return { ok: true, cells: solution.length, completeMap }
}

// Solve the current game as part of a dailies run: wait until the game's clock
// reaches the configured target (so it records ~that time), then complete it,
// and advance to the next game. "Use game time" skips the wait entirely.
async function solveForDaily() {
  clearTimeout(dailyWatchdog)
  // Re-check now that the board has loaded and LinkedIn's state is populated:
  // an already-solved puzzle must skip straight away, never wait out the timer.
  if (GameState.isSolved(game, lastMap)) {
    await DailyRunner.advance('skipped')
    return
  }
  const target = DailyRunner.targetSeconds(dailyState)
  try {
    if (target != null) {
      const elapsed = () => elapsedAnchor.base + (Date.now() - elapsedAnchor.at) / 1000
      while (elapsed() < target) await new Promise((r) => setTimeout(r, 100))
    }
    const res = await applySolution({ completeMap: true, solveSeconds: 0, skipSolvedCheck: true })
    if (res?.ok) await DailyRunner.advance('done')
    else await DailyRunner.advance('error', res?.error || 'failed')
  } catch (err) {
    await DailyRunner.advance('error', err?.message || String(err))
  }
}

function isDailyTurn() {
  return !!dailyState?.active && !dailyState.finished && game?.id === DailyRunner.expectedId(dailyState)
}

async function onMapReady(el) {
  // Remember which game this poll belongs to. Extraction is async (it fetches the
  // puzzle), so by the time it resolves the user may have navigated to a *different*
  // game — bail then, so a stale game's banner doesn't pop up and block the new one.
  // We key on the game itself, not the session id: LinkedIn often settles a route in
  // two URL hops (e.g. trailing slash or a transient /preload/), and bailing on those
  // would suppress the banner. Only a *different* detected game means we've moved on;
  // a null detection (a transitional route like /preload/) is not a reason to bail.
  const myGame = game
  let data
  try {
    data = await game.extractor.extract(el)
  } catch (err) {
    console.error('[hackTheLink] Map extraction failed:', err)
    if (isDailyTurn()) await DailyRunner.advance('error', 'extraction failed')
    return
  }
  const detected = GameRegistry.detect()
  if (game !== myGame || (detected && detected !== myGame)) return
  lastMap = data
  const base = GameState.readElapsedSeconds(game) ?? 0
  elapsedAnchor = { at: Date.now(), base }
  chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
  console.log('[hackTheLink] Map extracted')

  solutionPromise = computeSolution(data)

  if (isDailyTurn()) {
    solveForDaily()
  } else if (autoRunRequested()) {
    applySolution()
  } else {
    Banner.show({ game, map: data, solution: solutionPromise, onSolve: applySolution })
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_MAP') {
    sendResponse({ map: lastMap })
    return
  }
  if (message.type === 'GET_SOLUTION') {
    if (!solutionPromise) {
      sendResponse({ solution: null })
      return
    }
    solutionPromise.then((solution) => sendResponse({ solution }))
    return true // keep the channel open for the async sendResponse
  }
  if (message.type === 'SOLVE_NOW') {
    applySolution().then(sendResponse)
    return true // keep the channel open for the async sendResponse
  }
})

function waitForElement(selector, onFound, intervalMs = 500, maxAttempts = 60) {
  let attempts = 0
  const interval = setInterval(() => {
    attempts++
    const el = document.querySelector(selector)
    if (el) {
      clearInterval(interval)
      onFound(el)
    } else if (attempts >= maxAttempts) {
      clearInterval(interval)
      console.warn(`[hackTheLink] "${selector}" not found after ${maxAttempts} attempts`)
    }
  }, intervalMs)
  return interval
}

// Tear down everything tied to the previously detected game so a new route
// starts from a clean slate (no stale banner, map, or in-flight poll).
function resetSession() {
  if (pendingWait) {
    clearInterval(pendingWait)
    pendingWait = null
  }
  clearTimeout(dailyWatchdog)
  document.getElementById('hackthelink-banner')?.remove()
  lastMap = null
  solutionPromise = null
  elapsedAnchor = null
}

async function startGame() {
  if (!isContextAlive()) return shutdown()
  resetSession()
  game = GameRegistry.detect()
  dailyState = await DailyRunner.read()

  // A dailies run is in progress: the overlay persists and we drive this game.
  if (dailyState?.active) {
    DailyOverlay.render(dailyState)
    if (dailyState.finished) return

    const expectedId = DailyRunner.expectedId(dailyState)
    if (!game || game.id !== expectedId) {
      DailyRunner.gotoExpected(dailyState)
      return
    }
    // NB: don't decide "already solved" here — at this point the board hasn't
    // loaded and today's localStorage keys may not be written yet, so isSolved
    // (with no map) can false-positive on yesterday's solved puzzle. solveForDaily
    // re-checks with the live board+map after onMapReady and skips for real then.
    // Mark it active in the overlay, then wait for the board to solve it. A
    // watchdog fails the game if its board never shows so the run can't stall.
    dailyState.statuses[expectedId] = 'solving'
    await DailyRunner.write(dailyState)
    DailyOverlay.render(dailyState)
    dailyWatchdog = setTimeout(() => DailyRunner.advance('error', 'board did not load'), 40000)
    pendingWait = waitForElement(game.selector, onMapReady)
    return
  }

  DailyOverlay.hide()
  if (game) {
    console.log(`[hackTheLink] ${game.name}: waiting for "${game.selector}"...`)
    pendingWait = waitForElement(game.selector, onMapReady)
  } else {
    console.log('[hackTheLink] No game configured for this URL')
  }
}

// React only to the run starting (kick off if we're already on a game page) or
// being cancelled (tear the overlay down). Per-game advances keep active=true
// and are handled by the navigation flow, so they're ignored here.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[DailyRunner.KEY]) return
  const wasActive = !!changes[DailyRunner.KEY].oldValue?.active
  const nowActive = !!changes[DailyRunner.KEY].newValue?.active
  if (!wasActive && nowActive) startGame()
  else if (wasActive && !nowActive) {
    dailyState = null
    DailyOverlay.hide()
  }
})

// LinkedIn games are an SPA: navigating between them never reloads this script,
// so watch for URL changes and re-run detection on each route.
let currentUrl = location.href
function onLocationMaybeChanged() {
  if (location.href === currentUrl) return
  currentUrl = location.href
  // LinkedIn routes a game through a transient `/preload/` URL while it loads, and
  // it often renders the board *under* that URL. Any route that doesn't resolve to
  // a game is treated as transitional: we keep the in-flight waitForElement alive
  // instead of tearing it down, so we still catch the board when it appears. If we
  // reset here, the wait dies and the board renders to nobody — no popup until a
  // full reload lands directly on /games/<id>/.
  if (!GameRegistry.detect()) return
  startGame()
}

// When the extension is reloaded/updated, this content script is orphaned but
// its intervals keep firing — every chrome.* call then throws "Extension context
// invalidated", which kills the flow and stops the banner from ever showing.
// Detect the dead context (chrome.runtime.id goes undefined) and tear ourselves
// down so we stop polling instead of throwing on every tick.
function isContextAlive() {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

function shutdown() {
  clearInterval(routeTick)
  if (pendingWait) clearInterval(pendingWait)
  clearTimeout(dailyWatchdog)
  window.removeEventListener('popstate', onLocationMaybeChanged)
  document.getElementById('hackthelink-banner')?.remove()
}

// A content script lives in an isolated world, so monkey-patching the page's
// history.pushState doesn't intercept LinkedIn's own SPA navigations, and
// popstate only fires on back/forward. Polling location.href is the only signal
// that reliably catches every route change from here.
window.addEventListener('popstate', onLocationMaybeChanged)
const routeTick = setInterval(() => {
  if (!isContextAlive()) return shutdown()
  onLocationMaybeChanged()
}, 400)

startGame()
