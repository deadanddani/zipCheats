import './SudokuBoard.css'
import type { SudokuCell } from '../models/Cell'
import type { SudokuMap } from '../models/Map'
import type { Resolution } from '../models/Resolution'

export function renderSudokuBoard(
  map: SudokuMap,
  resolution: Resolution,
  options?: { interactive?: boolean }
): HTMLElement {
  const interactive = options?.interactive ?? true
  const { size, boxSize } = map

  const wrapper = document.createElement('div')
  wrapper.className = 'sudoku-board'
  wrapper.style.setProperty('--cols', String(size))
  if (interactive) wrapper.tabIndex = 0

  const grid = document.createElement('div')
  grid.className = 'sudoku-grid'

  const cellEls: HTMLElement[] = []
  let selected: SudokuCell | null = null

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = map.cellAt(row, col)!
      const el = document.createElement('div')
      el.className = 'sudoku-cell'
      if (cell.given) el.classList.add('is-given')

      // Thicker rules on the boundaries between 3×3 boxes.
      if (col % boxSize === 0) el.classList.add('box-left')
      if (row % boxSize === 0) el.classList.add('box-top')
      if (col === size - 1) el.classList.add('box-right')
      if (row === size - 1) el.classList.add('box-bottom')

      if (interactive && !cell.given) {
        el.addEventListener('click', () => {
          selected = cell
          wrapper.focus()
          render()
        })
      }

      cellEls[row * size + col] = el
      grid.appendChild(el)
    }
  }

  wrapper.appendChild(grid)

  // ── Number pad (manual play) ──
  if (interactive) {
    const pad = document.createElement('div')
    pad.className = 'sudoku-pad'
    for (let value = 1; value <= size; value++) {
      const btn = document.createElement('button')
      btn.className = 'sudoku-pad__key'
      btn.textContent = String(value)
      btn.addEventListener('click', () => {
        if (selected) resolution.setValue(selected, value)
      })
      pad.appendChild(btn)
    }
    const erase = document.createElement('button')
    erase.className = 'sudoku-pad__key sudoku-pad__key--erase'
    erase.textContent = '⌫'
    erase.addEventListener('click', () => {
      if (selected) resolution.clearValue(selected)
    })
    pad.appendChild(erase)
    wrapper.appendChild(pad)

    wrapper.addEventListener('keydown', (event) => {
      if (!selected) return
      if (event.key >= '1' && event.key <= String(size)) {
        resolution.setValue(selected, Number(event.key))
        event.preventDefault()
      } else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        resolution.clearValue(selected)
        event.preventDefault()
      } else if (event.key.startsWith('Arrow')) {
        const delta: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        }
        const [dr, dc] = delta[event.key]
        const next = map.cellAt(selected.row + dr, selected.col + dc)
        if (next) {
          selected = next
          render()
        }
        event.preventDefault()
      }
    })
  }

  function render() {
    for (let i = 0; i < map.cells.length; i++) {
      const cell = map.cells[i]
      const el = cellEls[i]
      el.textContent = cell.value === 0 ? '' : String(cell.value)
      el.classList.toggle('is-selected', interactive && cell === selected)
      el.classList.toggle('is-conflict', cell.value !== 0 && map.conflictsFor(cell).length > 0)
    }
    wrapper.classList.toggle('sudoku-board--solved', resolution.isCompleted())
  }

  resolution.onChange = render
  render()

  return wrapper
}
