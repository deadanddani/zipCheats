// Shared, game-agnostic UI controls. Currently just the "Complete map" toggle,
// which is a Settings flag (not specific to any one game), so it lives here and
// is reused by both the in-page banner and the popup. Loaded as a classic script
// in both contexts, so it exposes a global.
const Controls = {
  // Custom "Complete map" checkbox, persisted via Settings. Optional `hint`
  // renders a small explanatory line under the label.
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
}
