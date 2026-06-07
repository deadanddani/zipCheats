import './GridBoard.css'
import type { Cell } from '../models/Cell'
import type { ZipMap } from '../models/Map'
import { Resolution } from '../models/Resolution'

function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

type Direction = 'top' | 'right' | 'bottom' | 'left'

function directionTo(from: Cell, to: Cell): Direction {
  if (to.row < from.row) return 'top'
  if (to.row > from.row) return 'bottom'
  return to.col < from.col ? 'left' : 'right'
}

function makeSegment(direction: Direction): HTMLElement {
  const seg = document.createElement('div')
  seg.className = `path-seg path-seg--${direction}`
  return seg
}

function isWallBetween(a: Cell, b: Cell): boolean {
  if (a.row === b.row) return a.col < b.col ? a.walls.right || b.walls.left : a.walls.left || b.walls.right
  return a.row < b.row ? a.walls.bottom || b.walls.top : a.walls.top || b.walls.bottom
}

// only one board solves at a time, so a previous listener can be torn down unconditionally
let detachPreviousDrag: (() => void) | null = null

export function renderGrid(map: ZipMap, resolution: Resolution): HTMLElement {
  detachPreviousDrag?.()

  const { rows, cols } = map

  const board = document.createElement('div')
  board.className = 'grid-board'
  board.style.setProperty('--cols', String(cols))

  const cellEls: HTMLElement[][] = Array.from({ length: rows }, () => [] as HTMLElement[])
  const trackEls: HTMLElement[][] = Array.from({ length: rows }, () => [] as HTMLElement[])
  let dragging = false

  function render() {
    const { path } = resolution
    const head = path[path.length - 1]

    const segments = new Map<string, { from?: Direction; to?: Direction }>()
    for (let i = 0; i < path.length; i++) {
      const cell = path[i]
      segments.set(`${cell.row},${cell.col}`, {
        from: i > 0 ? directionTo(cell, path[i - 1]) : undefined,
        to: i < path.length - 1 ? directionTo(cell, path[i + 1]) : undefined,
      })
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = map.cellAt(r, c)!
        const el = cellEls[r][c]
        el.classList.toggle('cell-visited', cell.visited)
        el.classList.toggle('cell-head', head?.row === r && head?.col === c)

        const track = trackEls[r][c]
        track.replaceChildren()
        const info = segments.get(`${r},${c}`)
        if (info) {
          if (info.from) track.appendChild(makeSegment(info.from))
          if (info.to) track.appendChild(makeSegment(info.to))
          if (!info.from || !info.to) {
            const dot = document.createElement('div')
            dot.className = 'path-dot'
            track.appendChild(dot)
          }
        }
      }
    }

    board.classList.toggle('grid-board--solved', resolution.isCompleted())
  }

  function nextRequiredValue(): number | null {
    let highest = 0
    for (const cell of resolution.path) if (cell.value !== null) highest = cell.value
    return highest + 1
  }

  function tryStep(cell: Cell) {
    const { path } = resolution
    const last = path[path.length - 1]
    if (last.row === cell.row && last.col === cell.col) return

    const previous = path[path.length - 2]
    if (previous && previous.row === cell.row && previous.col === cell.col) {
      resolution.backStep()
      return
    }

    if (path.some(({ row, col }) => row === cell.row && col === cell.col)) return
    if (!isAdjacent(last, cell) || isWallBetween(last, cell)) return
    if (cell.value !== null && cell.value !== nextRequiredValue()) return

    resolution.addStep(cell)
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = map.cellAt(r, c)!
      const el = document.createElement('div')
      el.className = 'grid-cell'

      const track = document.createElement('div')
      track.className = 'path-track'
      el.appendChild(track)
      trackEls[r][c] = track

      if (cell.walls.right) el.classList.add('wall-right')
      if (cell.walls.bottom) el.classList.add('wall-bottom')

      // only render if neighbor doesn't already cover it
      const neighborLeft = c > 0 ? map.cellAt(r, c - 1) : null
      if (cell.walls.left && !neighborLeft?.walls.right) el.classList.add('wall-left')

      const neighborTop = r > 0 ? map.cellAt(r - 1, c) : null
      if (cell.walls.top && !neighborTop?.walls.bottom) el.classList.add('wall-top')

      if (cell.value !== null) {
        const num = document.createElement('span')
        num.className = 'cell-value'
        num.textContent = String(cell.value)
        el.appendChild(num)
      }

      el.addEventListener('mousedown', (e) => {
        e.preventDefault()
        if (cell.value !== 1) return
        resolution.reset()
        resolution.addStep(cell)
        dragging = true
        render()
      })

      el.addEventListener('mouseenter', () => {
        if (!dragging) return
        tryStep(cell)
        render()
      })

      cellEls[r][c] = el
      board.appendChild(el)
    }
  }

  function stopDragging() {
    dragging = false
  }

  document.addEventListener('mouseup', stopDragging)
  resolution.onChange = render

  detachPreviousDrag = () => {
    document.removeEventListener('mouseup', stopDragging)
    resolution.onChange = undefined
  }

  render()

  return board
}
