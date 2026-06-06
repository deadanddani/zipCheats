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
  waitForElement(game.extractor.selector, (el) => {
    console.log('[zipCheats] Element found, extracting...')
    const data = game.extractor.extract(el)
    chrome.runtime.sendMessage({ type: 'SEND_MAP', data, url: location.href })
    console.log('[zipCheats] Map sent to background')
  })
} else {
  console.log('[zipCheats] No game configured for this URL')
}
