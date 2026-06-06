export interface Cell {
  row: number
  col: number
  value: number | null
  walls: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }
}

export type Grid = Cell[][]

export function createGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      value: null,
      walls: { top: false, right: false, bottom: false, left: false },
    }))
  )
}

export function addWall(grid: Grid, r: number, c: number, side: 'top' | 'right' | 'bottom' | 'left') {
  grid[r][c].walls[side] = true
  if (side === 'right'  && c + 1 < grid[0].length) grid[r][c + 1].walls.left   = true
  if (side === 'left'   && c - 1 >= 0)             grid[r][c - 1].walls.right  = true
  if (side === 'bottom' && r + 1 < grid.length)    grid[r + 1][c].walls.top    = true
  if (side === 'top'    && r - 1 >= 0)             grid[r - 1][c].walls.bottom = true
}
