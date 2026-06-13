// Fetches the Queens puzzle from LinkedIn, mirroring ZipExtractor. The endpoint
// returns HTML with the puzzle embedded in its RSC payload under
// `queensGamePuzzle`: { gridSize, colorGrid: [{ colors: [...] }], solution: [{ row, col }] }.
const QueensExtractor = {
  endpoint: 'https://www.linkedin.com/flagship-web/games/queens/',

  // Fallback board used only if the fetch/parse fails.
  MOCK_GRID: [
    [3, 3, 3, 3, 3, 0, 3, 3],
    [3, 3, 3, 3, 0, 0, 0, 3],
    [2, 3, 3, 1, 4, 4, 4, 3],
    [2, 2, 3, 1, 1, 4, 3, 3],
    [2, 3, 3, 1, 3, 3, 3, 7],
    [3, 3, 6, 6, 6, 3, 7, 7],
    [3, 3, 3, 6, 3, 3, 5, 7],
    [3, 3, 3, 3, 3, 5, 5, 5],
  ],

  async extract() {
    try {
      const puzzle = await this.fetchPuzzle()
      console.log('[hackTheLink] queensGamePuzzle raw payload:', puzzle)
      const map = this.toMap(puzzle)
      if (map) return map
      console.warn('[hackTheLink] Could not map queensGamePuzzle yet — using mock board')
    } catch (err) {
      console.warn('[hackTheLink] Queens fetch/parse failed, using mock board:', err)
    }
    return this.mockMap()
  },

  async fetchPuzzle() {
    const res = await fetch(this.endpoint, { credentials: 'include' })
    if (!res.ok) throw new Error(`Queens endpoint returned ${res.status}`)
    return this.parsePuzzle(await res.text())
  },

  // Brace-depth scan + escape-peeling (same as ZipExtractor): the object's quotes
  // are escaped in the payload but its braces are not.
  parsePuzzle(html) {
    const at = html.indexOf('queensGamePuzzle')
    if (at === -1) throw new Error('queensGamePuzzle not found in payload')

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
    throw new Error('could not parse queensGamePuzzle JSON')
  },

  toMap(puzzle) {
    const grid = this.extractRegionGrid(puzzle)
    if (!grid) return null
    const rows = grid.length
    const cols = grid[0]?.length ?? 0
    return { rows, cols, grid, solution: this.extractSolution(puzzle) }
  },

  extractRegionGrid(puzzle) {
    const colorGrid = puzzle?.colorGrid
    if (Array.isArray(colorGrid) && colorGrid.length) {
      if (Array.isArray(colorGrid[0]?.colors)) return colorGrid.map((row) => row.colors)
      if (Array.isArray(colorGrid[0])) return colorGrid
    }
    const size = puzzle?.gridSize ?? puzzle?.size
    const flat = puzzle?.regions ?? puzzle?.cellColors ?? puzzle?.colors
    if (size && Array.isArray(flat) && flat.length === size * size) {
      return Array.from({ length: size }, (_, r) => flat.slice(r * size, r * size + size))
    }
    return null
  },

  extractSolution(puzzle) {
    const sol = puzzle?.solution ?? puzzle?.queens
    if (!Array.isArray(sol)) return null
    return sol
      .map((q) => (typeof q === 'number' ? q : { row: q.row, col: q.col }))
      .filter((q) => typeof q === 'number' || (Number.isInteger(q.row) && Number.isInteger(q.col)))
  },

  mockMap() {
    const grid = this.MOCK_GRID
    return { rows: grid.length, cols: grid[0].length, grid, solution: null }
  },
}
