// The in-page progress card shown while a "solve all dailies" run is underway.
// It's recreated on every page (the content script calls render() on each load),
// so it appears to persist across the navigations between games. The progress
// bar is a line that threads through each game's icon, filling with colour as
// the run advances; it also shows elapsed time and any per-game errors.
const DailyOverlay = {
  ID: 'hackthelink-daily',
  _timer: null,

  // Remove the overlay and stop its clock.
  hide() {
    clearInterval(this._timer)
    this._timer = null
    document.getElementById(this.ID)?.remove()
  },

  render(state) {
    if (!state?.active) return this.hide()

    let el = document.getElementById(this.ID)
    if (!el) {
      el = document.createElement('div')
      el.id = this.ID
      document.body.appendChild(el)
    }
    // Green border once the whole run is done.
    el.classList.toggle('daily--done', !!state.finished)

    const done = state.finished ? state.order.length : state.index
    const total = state.order.length
    const errorCount = Object.keys(state.errors ?? {}).length
    const title = state.finished
      ? errorCount
        ? `Done — ${errorCount} failed`
        : 'All dailies solved'
      : `Solving dailies… ${Math.min(done + 1, total)}/${total}`

    el.innerHTML = `
      <div class="daily__head">
        <span class="daily__title">${title}</span>
        <span class="daily__time" data-since="${state.startedAt}">0:00</span>
        <button class="daily__close" type="button" aria-label="${state.finished ? 'Close' : 'Cancel'}">✕</button>
      </div>
      <div class="daily__track">${this.trackMarkup(state)}</div>
      ${this.errorMarkup(state)}
    `

    el.querySelector('.daily__close').addEventListener('click', () => {
      DailyRunner.cancel()
      this.hide()
    })

    this.startClock(el, state)
  },

  // Alternating nodes (game icons) and connecting segments. A segment/node is
  // "filled" once that game's slot is behind the current index.
  trackMarkup(state) {
    const parts = []
    state.order.forEach((id, i) => {
      const game = GameCatalog.byId(id)
      const status = state.statuses?.[id] ?? 'pending'
      const isCurrent = !state.finished && i === state.index
      if (i > 0) {
        const filled = i <= state.index || state.finished
        const active = !state.finished && i === state.index
        parts.push(`<span class="daily-seg ${filled ? 'daily-seg--filled' : ''} ${active ? 'daily-seg--active' : ''}"></span>`)
      }
      const icon = game ? chrome.runtime.getURL(game.icon) : ''
      parts.push(`
        <span class="daily-node daily-node--${status} ${isCurrent ? 'daily-node--current' : ''}" title="${game?.name ?? id}">
          <img class="daily-node__icon" src="${icon}" alt="${game?.name ?? id}" />
        </span>
      `)
    })
    return parts.join('')
  },

  errorMarkup(state) {
    const entries = Object.entries(state.errors ?? {})
    if (!entries.length) return ''
    const items = entries
      .map(([id, msg]) => `<li><b>${GameCatalog.byId(id)?.name ?? id}:</b> ${msg}</li>`)
      .join('')
    return `<ul class="daily__errors">${items}</ul>`
  },

  // Tick the elapsed time from the run's start timestamp. Once finished, paint
  // the frozen final time once and stop the clock.
  startClock(el, state) {
    clearInterval(this._timer)
    const node = el.querySelector('.daily__time')
    const paint = () => {
      const end = state.finished ? state.finishedAt ?? Date.now() : Date.now()
      const s = Math.max(0, Math.floor((end - state.startedAt) / 1000))
      node.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    }
    paint()
    if (!state.finished) this._timer = setInterval(paint, 1000)
  },
}
