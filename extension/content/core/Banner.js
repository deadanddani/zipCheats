// In-page card shown when you open a supported puzzle without the auto-run param.
// A browser extension can't pop its own toolbar UI open programmatically, so
// this injected card is how we ask "run the solver?" right on the page. It's
// game-agnostic: the board preview comes from the detected game's view.draw and
// the icon/name from its descriptor, so every game reuses the same card. The
// solver itself runs eagerly in main.js — here "Resolver" just applies the answer.
const Banner = {
  show({ game, map, onSolve }) {
    if (document.getElementById('hackthelink-banner')) return

    const banner = document.createElement('div')
    banner.id = 'hackthelink-banner'
    banner.innerHTML = `
      <div class="htl-banner__head">
        <img class="htl-banner__icon" src="${chrome.runtime.getURL(game.icon)}" alt="" />
        <span class="htl-banner__label">hackTheLink detected a ${game.name}</span>
        <button class="htl-banner__close" type="button" aria-label="Close">✕</button>
      </div>
      <div class="game-preview"><canvas class="game-canvas"></canvas></div>
      <div class="htl-banner__toggle"></div>
      <button class="htl-banner__solve" type="button">Solve</button>
    `

    game.view.draw(banner.querySelector('.game-canvas'), map)
    banner.querySelector('.htl-banner__toggle').appendChild(Controls.createCompleteMapToggle())

    const solveBtn = banner.querySelector('.htl-banner__solve')
    solveBtn.addEventListener('click', async () => {
      solveBtn.disabled = true
      solveBtn.classList.add('htl-banner__solve--busy')
      solveBtn.textContent = 'Solving…'
      try {
        await onSolve() // waits for the eager solve if it isn't done yet
      } finally {
        banner.remove()
      }
    })

    banner.querySelector('.htl-banner__close').addEventListener('click', () => banner.remove())

    document.body.appendChild(banner)
  },
}
