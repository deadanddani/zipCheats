let game = null
let lastMap = null
let solutionPromise = null
let pendingWait = null // cancels the in-flight waitForElement poll on navigation
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

async function applySolution() {
  if (!solutionPromise) {
    console.warn('[hackTheLink] No map extracted yet')
    return { ok: false, error: 'no-map' }
  }

  const solution = await solutionPromise
  if (!solution) return { ok: false, error: 'no-solution' }

  const { completeMap } = await Settings.get()
  const solveSeconds = await Settings.getSolveSeconds(game.id)
  await game.player.play(solution, { completeMap, map: lastMap, solveSeconds, elapsedAnchor })
  return { ok: true, cells: solution.length, completeMap }
}

async function onMapReady(el) {
  let data
  try {
    data = await game.extractor.extract(el)
  } catch (err) {
    console.error('[hackTheLink] Map extraction failed:', err)
    return
  }
  lastMap = data
  const base = typeof game.player.readElapsedSeconds === 'function' ? (game.player.readElapsedSeconds() ?? 0) : 0
  elapsedAnchor = { at: Date.now(), base }
  chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
  console.log('[hackTheLink] Map extracted')

  solutionPromise = computeSolution(data)

  if (autoRunRequested()) {
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
  document.getElementById('hackthelink-banner')?.remove()
  lastMap = null
  solutionPromise = null
  elapsedAnchor = null
}

function startGame() {
  resetSession()
  game = GameRegistry.detect()
  if (game) {
    console.log(`[hackTheLink] ${game.name}: waiting for "${game.selector}"...`)
    pendingWait = waitForElement(game.selector, onMapReady)
  } else {
    console.log('[hackTheLink] No game configured for this URL')
  }
}

// LinkedIn games are an SPA: navigating between them never reloads this script,
// so watch for URL changes and re-run detection on each route.
let currentUrl = location.href
function onLocationMaybeChanged() {
  if (location.href === currentUrl) return
  currentUrl = location.href
  startGame()
}

// A content script lives in an isolated world, so monkey-patching the page's
// history.pushState doesn't intercept LinkedIn's own SPA navigations, and
// popstate only fires on back/forward. Polling location.href is the only signal
// that reliably catches every route change from here.
window.addEventListener('popstate', onLocationMaybeChanged)
setInterval(onLocationMaybeChanged, 400)

startGame()
