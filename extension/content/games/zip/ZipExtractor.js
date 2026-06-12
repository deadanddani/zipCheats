const ZipExtractor = {
  selector: '[data-trail-grid]',

  extract(gridEl) {
    const { rows, cols } = this.dimensions(gridEl)

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
      grid[row][col].walls = WallDetector.extract(cellEl)
    }

    // Diagnostic snapshot: the rejilla's raw HTML lets us rebuild a
    // wall extractor that doesn't depend on LinkedIn's hashed classes.
    // Harmless to keep; the server only writes it to a debug file.
    return { rows, cols, grid, html: gridEl.outerHTML, wallDebug: this.wallDebug(cols) }
  },

  // Diagnostic: for every non-content child div of every cell, capture the
  // computed geometry/border/background of the element and its ::before /
  // ::after pseudo-elements. This reveals exactly how a wall and its side
  // are encoded so the real detector can be written against ground truth.
  wallDebug(cols) {
    const px = (v) => Math.round(parseFloat(v) || 0)
    const borders = (s) => [px(s.borderTopWidth), px(s.borderRightWidth), px(s.borderBottomWidth), px(s.borderLeftWidth)]
    const out = []
    for (const cellEl of document.querySelectorAll('[data-cell-idx]')) {
      const idx = parseInt(cellEl.dataset.cellIdx)
      const cell = cellEl.getBoundingClientRect()
      for (const el of cellEl.children) {
        if (el.matches('[data-cell-content]')) continue
        const r = el.getBoundingClientRect()
        const self = getComputedStyle(el)
        const before = getComputedStyle(el, '::before')
        const after = getComputedStyle(el, '::after')
        out.push({
          idx,
          rc: [Math.floor(idx / cols), idx % cols],
          cls: el.className,
          rect: { w: Math.round(r.width), h: Math.round(r.height), dx: Math.round(r.left - cell.left), dy: Math.round(r.top - cell.top) },
          pos: self.position,
          bg: self.backgroundColor,
          bd: borders(self),
          beforeContent: before.content,
          beforeBd: borders(before),
          beforeBg: before.backgroundColor,
          beforeRect: [px(before.width), px(before.height)],
          afterContent: after.content,
          afterBd: borders(after),
          afterBg: after.backgroundColor,
          afterRect: [px(after.width), px(after.height)],
        })
      }
    }
    return out
  },

  // LinkedIn's grid dimensions used to be exposed via hashed CSS custom
  // properties (--d07f72d6 / --eb9f871d), but those hashes change between
  // builds. The puzzle is always a square grid, so the cell count is the
  // most reliable source: derive the side from sqrt(cellCount), falling
  // back to the CSS grid template (also stable, unhashed) if it isn't.
  dimensions(gridEl) {
    const cellCount = document.querySelectorAll('[data-cell-idx]').length

    const side = Math.round(Math.sqrt(cellCount))
    if (side * side === cellCount) return { rows: side, cols: side }

    const style = getComputedStyle(gridEl)
    const cols = style.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
    const rows = style.gridTemplateRows.trim().split(/\s+/).filter(Boolean).length
    if (cols > 0 && rows > 0) return { rows, cols }

    return { rows: 8, cols: 8 }
  },
}
