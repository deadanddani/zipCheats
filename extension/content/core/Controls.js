// Shared UI controls, reused by both the in-page banner and the popup.
const Controls = {
  createCompleteMapToggle({ hint } = {}) {
    const label = document.createElement('label')
    label.className = 'game-toggle'
    label.innerHTML = `
      <input type="checkbox" class="game-toggle__input" />
      <span class="game-toggle__box"><span class="game-toggle__tick"></span></span>
      <span class="game-toggle__text">Complete map</span>
      ${hint ? `<small class="game-toggle__hint">${hint}</small>` : ''}
    `

    const input = label.querySelector('.game-toggle__input')
    Settings.get().then((s) => {
      input.checked = s.completeMap
    })
    input.addEventListener('change', () => Settings.set({ completeMap: input.checked }))

    return label
  },

  // Per-game "target completion time" control: a slider with a large, editable
  // value. The player times the finishing move so LinkedIn records roughly this
  // many seconds. 0 is allowed but warns in red — completing instantly can crash
  // the board. The slider caps at SOLVE_TIME_MAX; the field accepts any value.
  SOLVE_TIME_MAX: 60,

  createSolveTimeControl(gameId) {
    const max = this.SOLVE_TIME_MAX
    const field = document.createElement('div')
    field.className = 'solve-time'
    field.innerHTML = `
      <div class="solve-time__head">
        <span class="solve-time__text">Solve time</span>
        <span class="solve-time__value">
          <input type="number" class="solve-time__input" min="0" step="1" inputmode="numeric" aria-label="Solve time in seconds" />
          <span class="solve-time__unit">s</span>
        </span>
      </div>
      <input type="range" class="solve-time__slider" min="0" max="${max}" step="1" aria-label="Solve time" />
      <small class="solve-time__warn" hidden>⚠ Completing in 0s can crash the board.</small>
    `

    const input = field.querySelector('.solve-time__input')
    const slider = field.querySelector('.solve-time__slider')
    const warn = field.querySelector('.solve-time__warn')

    const reflect = (n) => {
      input.value = String(n)
      slider.value = String(Math.min(n, max))
      slider.style.setProperty('--fill', `${(Math.min(n, max) / max) * 100}%`)
      const danger = n <= 0
      warn.hidden = !danger
      field.classList.toggle('solve-time--danger', danger)
    }

    Settings.getSolveSeconds(gameId).then(reflect)

    const commit = (n) => {
      const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))
      reflect(v)
      Settings.setSolveSeconds(gameId, v)
    }

    slider.addEventListener('input', () => commit(parseInt(slider.value, 10)))
    input.addEventListener('input', () => commit(parseInt(input.value, 10)))

    // Disable and dim when Complete map is off, since the timing has no effect
    // then. Stays in sync via storage so it reflects toggles in either surface.
    const applyEnabled = (on) => {
      field.classList.toggle('solve-time--off', !on)
      slider.disabled = !on
      input.disabled = !on
    }
    Settings.get().then((s) => applyEnabled(s.completeMap))
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.completeMap) applyEnabled(changes.completeMap.newValue)
    })

    return field
  },

  // Markup for a spoiler-covered board preview: caller fills `inner` with the
  // `.game-preview` (canvas) to be blurred until revealed. Pair with wireSpoiler.
  spoilerMarkup(inner) {
    return `
      <div class="game-spoiler">
        ${inner}
        <button type="button" class="game-spoiler__cover">
          <span class="game-spoiler__label">See spoiler</span>
        </button>
      </div>
    `
  },

  // Reveal the board on click. Safe to call once per wrapper.
  wireSpoiler(wrapper) {
    if (!wrapper) return
    wrapper.querySelector('.game-spoiler__cover')?.addEventListener('click', () => {
      wrapper.classList.add('game-spoiler--revealed')
    })
  },
}
