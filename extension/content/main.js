// Orchestrates the Zip pipeline on LinkedIn: extract the board, expose it to
// the popup, and either auto-solve (when the page is opened with ?zipCheats=1)
// or offer an in-page prompt to solve.

let lastMap = null // the most recently extracted board, served to the popup

function autoRunRequested() {
  return new URL(location.href).searchParams.get('zipCheats') === '1'
}

async function runSolver() {
  if (!lastMap) {
    console.warn('[zipCheats] No map extracted yet')
    return { ok: false, error: 'no-map' }
  }

  const t0 = performance.now()
  const solution = ZipSolver.solve(lastMap.grid)
  const ms = (performance.now() - t0).toFixed(2)

  if (!solution) {
    console.warn(`[zipCheats] No solution found (${ms} ms)`)
    return { ok: false, error: 'no-solution' }
  }
  console.log(`[zipCheats] Solved in ${ms} ms — ${solution.length} cells`)
  Toast.show(`Solución encontrada en ${ms} ms`)

  const { completeMap } = await Settings.get()
  await ZipPlayer.play(solution, completeMap, lastMap.cols)
  return { ok: true, cells: solution.length, completeMap }
}

function onMapReady(el) {
  const data = game.extractor.extract(el)
  lastMap = data
  chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
  console.log('[zipCheats] Map extracted')

  if (autoRunRequested()) {
    runSolver()
  } else {
    Banner.show({ onSolve: runSolver })
  }
}

// The popup asks for the current map (to preview it) and can trigger a solve.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_MAP') {
    sendResponse({ map: lastMap })
    return // synchronous response
  }
  if (message.type === 'SOLVE_NOW') {
    runSolver().then(sendResponse)
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
      console.warn(`[zipCheats] "${selector}" not found after ${maxAttempts} attempts`)
    }
  }, intervalMs)
}

const game = GameRegistry.detect()

if (game) {
  console.log(`[zipCheats] Waiting for "${game.extractor.selector}"...`)
  waitForElement(game.extractor.selector, onMapReady)
} else {
  console.log('[zipCheats] No game configured for this URL')
}
