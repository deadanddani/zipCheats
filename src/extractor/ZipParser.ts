import { createGrid } from '../models/Cell'
import type { Grid } from '../models/Cell'

export function parseZipHtml(html: string): Grid {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const gridEl = doc.querySelector('[data-trail-grid]')
  const style = gridEl?.getAttribute('style') ?? ''

  const colsMatch = style.match(/--d07f72d6:\s*(\d+)/)
  const rowsMatch = style.match(/--eb9f871d:\s*(\d+)/)
  const cols = colsMatch ? parseInt(colsMatch[1]) : 8
  const rows = rowsMatch ? parseInt(rowsMatch[1]) : 8

  const grid = createGrid(rows, cols)

  const cellEls = doc.querySelectorAll('[data-cell-idx]')
  for (const cellEl of cellEls) {
    const idx = parseInt(cellEl.getAttribute('data-cell-idx') ?? '0')
    const row = Math.floor(idx / cols)
    const col = idx % cols

    if (row >= rows || col >= cols) continue

    const valueEl = cellEl.querySelector('[data-cell-content="true"]')
    if (valueEl?.textContent) {
      const val = parseInt(valueEl.textContent.trim())
      if (!isNaN(val)) grid[row][col].value = val
    }

    // TODO: parse walls from barrier divs (classes are obfuscated)
  }

  return grid
}
