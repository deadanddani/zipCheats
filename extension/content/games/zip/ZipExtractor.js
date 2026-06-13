// Fetches the puzzle from LinkedIn's data rather than scraping hashed CSS
// classes (which change between builds). The endpoint returns HTML with the
// puzzle embedded in its React Server Components payload under `trailGamePuzzle`:
//
//   { "gridSize": 7,
//     "orderedSequence": [48, 42, ...],   // cell idx that holds 1, 2, 3, ...
//     "solution": [48, 41, 40, ...],      // full solved path (cell indices)
//     "walls": [{ "cellIdx": 1, "direction": "WallDirection_DOWN" }, ...] }
//
// The fetch is same-origin, so session cookies ride along automatically.
const ZipExtractor = {
  endpoint: 'https://www.linkedin.com/flagship-web/games/zip/',

  async extract() {
    const puzzle = await this.fetchPuzzle()
    return this.toMap(puzzle)
  },

  async fetchPuzzle() {
    const res = await fetch(this.endpoint, { credentials: 'include' })
    if (!res.ok) throw new Error(`Zip endpoint returned ${res.status}`)
    return this.parsePuzzle(await res.text())
  },

  // Quotes inside the RSC string are escaped (sometimes doubly) but braces never
  // are, so a brace-depth scan finds the object regardless of escape layers; then
  // strip backslash layers until JSON.parse succeeds.
  parsePuzzle(html) {
    const at = html.indexOf('trailGamePuzzle')
    if (at === -1) throw new Error('trailGamePuzzle not found in payload')

    const start = html.indexOf('{', at)
    if (start === -1) throw new Error('puzzle object start not found')

    let depth = 0
    let end = -1
    for (let i = start; i < html.length; i++) {
      const ch = html[i]
      if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) {
        end = i
        break
      }
    }
    if (end === -1) throw new Error('puzzle object end not found')

    let raw = html.slice(start, end + 1)
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return JSON.parse(raw)
      } catch {
        raw = raw.replace(/\\(.)/g, '$1') // peel one escape layer
      }
    }
    throw new Error('could not parse trailGamePuzzle JSON')
  },

  toMap(puzzle) {
    const n = puzzle.gridSize
    const grid = Array.from({ length: n }, (_, row) =>
      Array.from({ length: n }, (_, col) => ({
        row,
        col,
        value: null,
        walls: { top: false, right: false, bottom: false, left: false },
      }))
    )

    // orderedSequence[i] is the cell index that holds the number i + 1.
    const seq = puzzle.orderedSequence ?? []
    for (let i = 0; i < seq.length; i++) {
      const cell = this.cellAt(grid, n, seq[i])
      if (cell) cell.value = i + 1
    }

    for (const wall of puzzle.walls ?? []) {
      this.applyWall(grid, n, wall.cellIdx, wall.direction)
    }

    // solution is LinkedIn's own solved path, kept for the dev app and debugging.
    return { rows: n, cols: n, grid, solution: puzzle.solution ?? null }
  },

  cellAt(grid, n, idx) {
    return grid[Math.floor(idx / n)]?.[idx % n]
  },

  SIDE: {
    WallDirection_UP: 'top',
    WallDirection_DOWN: 'bottom',
    WallDirection_LEFT: 'left',
    WallDirection_RIGHT: 'right',
  },
  OPPOSITE: { top: 'bottom', bottom: 'top', left: 'right', right: 'left' },
  OFFSET: { top: [-1, 0], bottom: [1, 0], left: [0, -1], right: [0, 1] },

  // Mark both the owning cell and its neighbour, so the wall is seen from either side.
  applyWall(grid, n, idx, direction) {
    const side = this.SIDE[direction]
    if (!side) return

    const cell = this.cellAt(grid, n, idx)
    if (!cell) return
    cell.walls[side] = true

    const [dr, dc] = this.OFFSET[side]
    const neighbor = grid[cell.row + dr]?.[cell.col + dc]
    if (neighbor) neighbor.walls[this.OPPOSITE[side]] = true
  },
}
