// Orchestrates the puzzle pipeline on LinkedIn for whichever game GameRegistry
// detects on the page: extract the board, expose it to the popup, and either
// auto-solve (when the page is opened with ?hackTheLink=1) or offer an in-page
// prompt to solve. Everything here is game-agnostic and goes through the
// detected game's extractor / solver / player / view.

const game = GameRegistry.detect() // the game on this page, or null
let lastMap = null // the most recently extracted board, served to the popup
let solutionPromise = null // resolves to the solved cell path (or null) — kicked off as soon as a map loads

function autoRunRequested() {
  return new URL(location.href).searchParams.get('hackTheLink') === '1'
}

// Runs the solver eagerly the moment a board is extracted, so the answer is
// usually ready before the user even clicks "Solve". We wrap the (synchronous)
// solve in a promise so callers can simply `await` it: if it's already done they
// get the answer instantly, otherwise they wait for it.
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

// Applies whatever solution the eager solve produced. If the solve hasn't
// finished yet, this waits for it and then plays it.
async function applySolution() {
  if (!solutionPromise) {
    console.warn('[hackTheLink] No map extracted yet')
    return { ok: false, error: 'no-map' }
  }

  const solution = await solutionPromise
  if (!solution) return { ok: false, error: 'no-solution' }

  const { completeMap } = await Settings.get()
  await game.player.play(solution, { completeMap, map: lastMap })
  return { ok: true, cells: solution.length, completeMap }
}

function onMapReady(el) {
  const data = game.extractor.extract(el)
  lastMap = data
  chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
  console.log('[hackTheLink] Map extracted')

  // Always start solving as soon as the board is ready.
  solutionPromise = computeSolution(data)

  if (autoRunRequested()) {
    applySolution()
  } else {
    Banner.show({ game, map: data, onSolve: applySolution })
  }
}

// The popup asks for the current map (to preview it) and can trigger a solve.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_MAP') {
    sendResponse({ map: lastMap })
    return // synchronous response
  }
  if (message.type === 'SOLVE_NOW') {
    applySolution().then(sendResponse)
    return true // async response
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
}

if (game) {
  console.log(`[hackTheLink] ${game.name}: waiting for "${game.selector}"...`)
  waitForElement(game.selector, onMapReady)
} else {
  console.log('[hackTheLink] No game configured for this URL')
}
