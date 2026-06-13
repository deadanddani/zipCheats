// A browser extension can't open its own toolbar UI programmatically, so this
// injected in-page card is how we offer the solve when the auto-run param is absent.
const Banner = {
  show({ game, map, solution, onSolve }) {
    if (document.getElementById('hackthelink-banner')) return

    const banner = document.createElement('div')
    banner.id = 'hackthelink-banner'
    banner.innerHTML = `
      <div class="htl-banner__head">
        <img class="htl-banner__icon" src="${chrome.runtime.getURL(game.icon)}" alt="" />
        <span class="htl-banner__label">hackTheLink detected a ${game.name}</span>
        <button class="htl-banner__close" type="button" aria-label="Close">✕</button>
      </div>
      ${Controls.spoilerMarkup('<div class="game-preview"><canvas class="game-canvas"></canvas></div>')}
      <div class="solve-options">
        <div class="htl-banner__toggle"></div>
        <div class="solve-options__divider"></div>
        <div class="htl-banner__solve-time"></div>
      </div>
      <button class="htl-banner__solve" type="button">Solve</button>
    `

    const canvas = banner.querySelector('.game-canvas')
    game.view.draw(canvas, map)
    // Paint the solution underneath the blur once it's ready.
    Promise.resolve(solution).then((sol) => {
      if (sol) game.view.draw(canvas, { ...map, solution: sol })
    })
    Controls.wireSpoiler(banner.querySelector('.game-spoiler'))
    banner.querySelector('.htl-banner__toggle').appendChild(Controls.createCompleteMapToggle())
    banner.querySelector('.htl-banner__solve-time').appendChild(Controls.createSolveTimeControl(game.id))

    const solveBtn = banner.querySelector('.htl-banner__solve')
    solveBtn.addEventListener('click', async () => {
      solveBtn.disabled = true
      solveBtn.classList.add('htl-banner__solve--busy')
      solveBtn.textContent = 'Solving…'
      try {
        await onSolve()
        // Keep the banner open and reveal the solution.
        banner.querySelector('.game-spoiler')?.classList.add('game-spoiler--revealed')
      } catch (err) {
        console.error('[hackTheLink] Solve failed:', err)
      } finally {
        // Re-enable so the user can solve again.
        solveBtn.disabled = false
        solveBtn.classList.remove('htl-banner__solve--busy')
        solveBtn.textContent = 'Solve'
      }
    })

    banner.querySelector('.htl-banner__close').addEventListener('click', () => banner.remove())

    document.body.appendChild(banner)
  },
}
