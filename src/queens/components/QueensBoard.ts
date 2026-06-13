import './QueensBoard.css'
import type { QueensMap } from '../models/Map'
import type { Resolution } from '../models/Resolution'

/** Region palette — distinct, LinkedIn-ish pastel colors, cycled if needed. */
const REGION_COLORS = [
  '#f7a4a4', '#a8d5a2', '#a9c7f0', '#f6d488', '#c8a8e0',
  '#88d4d4', '#f0b088', '#d4d488', '#e0a8c8', '#a8e0c0',
  '#c0c0c0', '#f0a0c0',
]

export function regionColor(region: number): string {
  return REGION_COLORS[region % REGION_COLORS.length]
}

export function renderQueensBoard(
  map: QueensMap,
  resolution: Resolution,
  options?: { interactive?: boolean }
): HTMLElement {
  const interactive = options?.interactive ?? true
  const { size } = map

  const board = document.createElement('div')
  board.className = 'queens-board'
  board.style.setProperty('--cols', String(size))

  const cellEls: HTMLElement[] = []

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = map.cellAt(row, col)!
      const el = document.createElement('div')
      el.className = 'queens-cell'
      el.style.setProperty('--region-color', regionColor(cell.region))

      // Thicken the border on sides where the neighboring region differs.
      const top = map.cellAt(row - 1, col)
      const bottom = map.cellAt(row + 1, col)
      const left = map.cellAt(row, col - 1)
      const right = map.cellAt(row, col + 1)
      if (!top || top.region !== cell.region) el.classList.add('region-top')
      if (!bottom || bottom.region !== cell.region) el.classList.add('region-bottom')
      if (!left || left.region !== cell.region) el.classList.add('region-left')
      if (!right || right.region !== cell.region) el.classList.add('region-right')

      if (interactive) {
        el.addEventListener('click', () => resolution.toggle(cell))
      }

      cellEls[row * size + col] = el
      board.appendChild(el)
    }
  }

  function render() {
    for (let i = 0; i < map.cells.length; i++) {
      const cell = map.cells[i]
      const el = cellEls[i]
      el.classList.toggle('is-blocked', cell.blocked && !cell.queen)
      el.replaceChildren()

      if (cell.queen) {
        const queen = document.createElement('span')
        queen.className = 'queens-cell__queen'
        queen.textContent = '👑'
        el.appendChild(queen)
      } else if (cell.blocked) {
        const mark = document.createElement('span')
        mark.className = 'queens-cell__block'
        mark.textContent = '✕'
        el.appendChild(mark)
      }
    }
    board.classList.toggle('queens-board--solved', resolution.isCompleted())
  }

  resolution.onChange = render
  render()

  return board
}
