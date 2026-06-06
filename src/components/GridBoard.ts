import './GridBoard.css'
import type { Grid } from '../models/Cell'

export function renderGrid(grid: Grid): HTMLElement {
  const rows = grid.length
  const cols = grid[0].length

  const board = document.createElement('div')
  board.className = 'grid-board'
  board.style.setProperty('--cols', String(cols))

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c]
      const el = document.createElement('div')
      el.className = 'grid-cell'

      if (cell.walls.right) el.classList.add('wall-right')
      if (cell.walls.bottom) el.classList.add('wall-bottom')

      // only render if neighbor doesn't already cover it
      const neighborLeft = c > 0 ? grid[r][c - 1] : null
      if (cell.walls.left && !neighborLeft?.walls.right) el.classList.add('wall-left')

      const neighborTop = r > 0 ? grid[r - 1][c] : null
      if (cell.walls.top && !neighborTop?.walls.bottom) el.classList.add('wall-top')

      if (cell.value !== null) {
        const num = document.createElement('span')
        num.className = 'cell-value'
        num.textContent = String(cell.value)
        el.appendChild(num)
      }

      board.appendChild(el)
    }
  }

  return board
}
