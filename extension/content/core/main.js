let game = null
let lastMap = null
let solutionPromise = null
let pendingWait = null // cancels the in-flight waitForElement poll on navigation
let dailyState = null // cached "solve all dailies" run state, refreshed per route
let dailyWatchdog = null // fails the current daily game if its board never loads
// LinkedIn's timer starts at puzzle load, which is ~when the board element
// appears. anchorClock() sets this then — base = seconds already on the clock
// (non-zero only when resuming a puzzle), at = our wall-clock reference — so the
// player can extrapolate the live elapsed time without scraping the DOM.
let elapsedAnchor = null

function autoRunRequested() {
  return new URL(location.href).searchParams.get('hackTheLink') === '1'
}

// The dailies flow navigates with ?hackTheLink=2 to keep it from colliding with
// the normal auto-run (=1) and with normal page loads. Captured once at script
// load — the daily flow does a full reload per game, so each load's URL carries
// the param, and we don't want a later LinkedIn URL rewrite to drop us mid-run.
const isDailyRun = new URL(location.href).searchParams.get('hackTheLink') === '2'

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

  // The banner can be clicked (or auto-run can fire) before LinkedIn finishes
  // rendering the board, so wait for it here rather than gating the whole flow.
  const board = await waitForBoard()
  if (!board) return { ok: false, error: 'no-board' }
  if (!elapsedAnchor) anchorClock()

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

// Extract the puzzle and prime the solution. Extraction is a same-origin fetch —
// it needs no DOM — so this runs the moment a game route is detected, well before
// the board renders. lastMap/solutionPromise are populated here so the banner (and
// GET_MAP/GET_SOLUTION) can answer immediately. Returns false if extraction failed
// or the user navigated to a different game mid-fetch (a stale result we discard,
// so its banner doesn't pop up over the new game).
async function extractMap() {
  const myGame = game
  let data
  const t0 = performance.now()
  try {
    data = await game.extractor.extract()
  } catch (err) {
    console.error('[hackTheLink] Map extraction failed:', err)
    return false
  }
  const detected = GameRegistry.detect()
  if (game !== myGame || (detected && detected !== myGame)) return false
  lastMap = data
  chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
  console.log(
    `[hackTheLink] Map extracted in ${(performance.now() - t0).toFixed(2)} ms (page t+${performance.now().toFixed(0)} ms)`,
  )
  solutionPromise = computeSolution(data)
  return true
}

// LinkedIn's clock starts at puzzle load ≈ when the board renders; anchor here so
// the player and daily timing can extrapolate live elapsed seconds. base is the
// time already on the clock (non-zero only when resuming a puzzle).
function anchorClock() {
  elapsedAnchor = { at: Date.now(), base: GameState.readElapsedSeconds(game) ?? 0 }
}

// Normal (non-daily) flow: get the map and show the banner as fast as possible,
// then anchor the clock in the background once the board appears — the banner is
// never blocked on the board, only the actual solve (in applySolution) is.
async function prepareGame(extracted) {
  if (!(await extracted)) return
  if (autoRunRequested()) applySolution()
  else Banner.show({ game, map: lastMap, solution: solutionPromise, onSolve: applySolution })
  pendingWait = waitForElement(game.selector, anchorClock)
}

// Daily flow: the board is required (we solve into it), so wait for it, anchor
// the clock, make sure extraction landed, and drive the solve.
async function onDailyBoardReady(extracted) {
  anchorClock()
  if (!(await extracted)) {
    await DailyRunner.advance('error', 'extraction failed')
    return
  }
  solveForDaily()
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

// Promise form used by the solve path: resolves with the board element once it
// exists, or null after the timeout (so a never-rendering board returns an error
// instead of hanging the Solve click).
function waitForBoard(timeoutMs = 8000) {
  const el = document.querySelector(game.selector)
  if (el) return Promise.resolve(el)
  return new Promise((resolve) => {
    const t0 = Date.now()
    const iv = setInterval(() => {
      const found = document.querySelector(game.selector)
      if (found) {
        clearInterval(iv)
        resolve(found)
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(iv)
        resolve(null)
      }
    }, 100)
  })
}

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
  // Kick off extraction right away — it's the slow step (reads the puzzle from
  // the page) and needs nothing from storage, so run it in parallel with the
  // DailyRunner read below instead of waiting on it. Every branch reuses this one
  // promise rather than extracting again.
  const extracted = game ? extractMap() : Promise.resolve(false)
  dailyState = await DailyRunner.read()

  // Dailies are gated on the ?hackTheLink=2 URL (not just storage), so a finished
  // or stale run can never hijack a normal page load.
  if (isDailyRun) {
    if (dailyState?.active) {
      DailyOverlay.render(dailyState)

      const expectedId = DailyRunner.expectedId(dailyState)
      if (!game || game.id !== expectedId) {
        DailyRunner.gotoExpected(dailyState)
        return
      }
      // NB: don't decide "already solved" here — at this point the board hasn't
      // loaded and today's localStorage keys may not be written yet, so isSolved
      // (with no map) can false-positive on yesterday's solved puzzle. solveForDaily
      // re-checks with the live board+map once the board is ready, and skips then.
      // Mark it active in the overlay, then wait for the board to solve it. A
      // watchdog fails the game if its board never shows so the run can't stall.
      dailyState.statuses[expectedId] = 'solving'
      await DailyRunner.write(dailyState)
      DailyOverlay.render(dailyState)
      dailyWatchdog = setTimeout(() => DailyRunner.advance('error', 'board did not load'), 40000)
      pendingWait = waitForElement(game.selector, () => onDailyBoardReady(extracted))
      return
    }
    if (dailyState?.finished) {
      DailyOverlay.render(dailyState) // run already done: just show the summary
      return
    }
    // Reached a daily URL with no run in progress — tell the user and fall through
    // to the normal flow so the page is still usable.
    Toast.show('No hay una ejecución de dailies activa.')
  }

  DailyOverlay.hide()
  if (game) {
    prepareGame(extracted)
  } else {
    console.log('[hackTheLink] No game configured for this URL')
  }
}

// React to the run starting (navigate to the first game's daily URL so the
// param-gated flow engages, even if we're already on a game page) and to it
// ending — either finishing (active flips false but we keep the summary) or
// being cancelled (tear the overlay down). Per-game advances keep active=true
// and are handled by the navigation flow, so they're ignored here.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[DailyRunner.KEY]) return
  const newV = changes[DailyRunner.KEY].newValue
  const wasActive = !!changes[DailyRunner.KEY].oldValue?.active
  const nowActive = !!newV?.active
  if (!wasActive && nowActive) {
    DailyRunner.gotoExpected(newV)
  } else if (wasActive && !nowActive) {
    if (newV?.finished) {
      dailyState = newV
      DailyOverlay.render(newV) // run finished: keep showing the summary
    } else {
      dailyState = null
      DailyOverlay.hide() // run cancelled
    }
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
  if (!GameRegistry.detect()) {
    // We've left the games area (e.g. /feed) — drop our injected UI so it doesn't
    // linger over the rest of LinkedIn. The board wait stays alive on purpose; if
    // this turns out to be a transient /preload/ that settles back onto the game,
    // startGame re-shows the banner. The overlay belongs to a daily run (driven by
    // full reloads) so we leave it for DailyOverlay to manage.
    document.getElementById('hackthelink-banner')?.remove()
    document.getElementById('hackthelink-toast')?.remove()
    return
  }
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
