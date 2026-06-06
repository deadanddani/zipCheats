const ZipExtractor = {
  selector: '[data-trail-grid]',

  extract(gridEl) {
    const cols = parseInt(getComputedStyle(gridEl).getPropertyValue('--d07f72d6').trim()) || 8
    const rows = parseInt(getComputedStyle(gridEl).getPropertyValue('--eb9f871d').trim()) || 8

    const grid = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        row,
        col,
        value: null,
        walls: { top: false, right: false, bottom: false, left: false },
      }))
    )

    for (const cellEl of document.querySelectorAll('[data-cell-idx]')) {
      const idx = parseInt(cellEl.dataset.cellIdx)
      const row = Math.floor(idx / cols)
      const col = idx % cols
      if (row >= rows || col >= cols) continue

      const valueEl = cellEl.querySelector('[data-cell-content="true"]')
      const parsed = valueEl ? parseInt(valueEl.textContent.trim()) : NaN
      grid[row][col].value = isNaN(parsed) ? null : parsed
      grid[row][col].walls = ZipWalls.extract(cellEl)
    }

    return { rows, cols, grid }
  },
}
