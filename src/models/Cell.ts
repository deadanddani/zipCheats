export interface Move {
  cell: Cell
  visited: boolean
}

export interface Cell {
  row: number
  col: number
  value: number | null
  visited: boolean
  validMoves?: Move[]
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
      visited: false,
      walls: { top: false, right: false, bottom: false, left: false },
    }))
  )
}
