// Fetches LinkedIn's 6×6 "Mini Sudoku" from its RSC payload under
// `miniSudokuGamePuzzle`. The key appears several times in the HTML (schema /
// model-definition blocks first), so we scan every occurrence and keep the one
// that actually carries puzzle data:
//
//   { gridRowSize: 6, gridColSize: 6,
//     presetCellIdxes: [6, 7, ...],          // flat idx of the given clues
//     solution: [4, 5, 3, ...],              // n*n digits, the full answer
//     regions, columnRestrictions, name }
//
// A given cell's digit is read from `solution` at the same index. Quotes are
// HTML-entity escaped (&quot;), so parsing decodes entities too.
const SudokuExtractor = {
  endpoint: 'https://www.linkedin.com/flagship-web/games/mini-sudoku/',

  KEY: 'miniSudokuGamePuzzle',

  // A valid 6×6 mini-sudoku puzzle (0 = empty), used only if extraction fails.
  MOCK_GRID: [
    [1, 0, 3, 0, 5, 0],
    [0, 5, 0, 1, 0, 3],
    [2, 0, 4, 0, 6, 0],
    [0, 6, 0, 2, 0, 4],
    [5, 0, 1, 0, 4, 0],
    [0, 4, 0, 5, 0, 1],
  ],

  async extract() {
    try {
      const puzzle = await this.fetchPuzzle()
      console.log('[hackTheLink] miniSudokuGamePuzzle raw payload:', puzzle)
      const map = this.toMap(puzzle)
      if (map) return map
      console.warn('[hackTheLink] Could not map miniSudokuGamePuzzle yet — using mock board')
    } catch (err) {
      console.warn('[hackTheLink] Sudoku fetch/parse failed, using mock board:', err)
    }
    return this.mockMap()
  },

  async fetchPuzzle() {
    // The loaded page already embeds the puzzle (it's what the board renders
    // from), so try the DOM first — a string scan, no network. Fall back to a
    // same-origin fetch (e.g. after an SPA navigation that didn't reload).
    try {
      const puzzle = this.parsePuzzle(domPayload())
      console.log('[hackTheLink] Sudoku: puzzle read from DOM (no fetch)')
      return puzzle
    } catch {}
    console.log('[hackTheLink] Sudoku: puzzle not in DOM, fetching endpoint')
    const res = await fetch(this.endpoint, { credentials: 'include' })
    if (!res.ok) throw new Error(`Sudoku endpoint returned ${res.status}`)
    return this.parsePuzzle(await res.text())
  },

  // Walk every occurrence of the key; the data object is the one carrying a
  // `solution` array. Braces are never escaped, so a depth scan delimits each
  // object; entities + backslashes are peeled until JSON.parse succeeds.
  parsePuzzle(html) {
    let at = html.indexOf(this.KEY)
    while (at !== -1) {
      const obj = this.objectAt(html, at + this.KEY.length)
      if (obj && Array.isArray(obj.solution)) return obj
      at = html.indexOf(this.KEY, at + 1)
    }
    throw new Error(`no ${this.KEY} object with a solution found in payload`)
  },

  objectAt(html, from) {
    const start = html.indexOf('{', from)
    if (start === -1) return null

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
    if (end === -1) return null

    let raw = html.slice(start, end + 1)
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        return JSON.parse(raw)
      } catch {
        raw = this.decodeEntities(raw).replace(/\\(.)/g, '$1') // peel one layer
      }
    }
    return null
  },

  decodeEntities(s) {
    return s
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#x22;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  },

  toMap(puzzle) {
    const n = puzzle?.gridRowSize ?? puzzle?.gridColSize ?? puzzle?.gridSize
    const solution = puzzle?.solution
    if (!n || !Array.isArray(solution) || solution.length !== n * n) return null

    // Full solved grid (2D digits), then the clue board with only givens filled.
    const solved = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => this.toDigit(solution[r * n + c])),
    )
    const grid = Array.from({ length: n }, () => new Array(n).fill(0))
    for (const idx of puzzle.presetCellIdxes ?? []) {
      const r = Math.floor(idx / n)
      const c = idx % n
      if (solved[r]) grid[r][c] = solved[r][c]
    }

    return { rows: n, cols: n, grid, solution: solved }
  },

  toDigit(v) {
    const n = typeof v === 'string' ? parseInt(v, 10) : v
    return Number.isInteger(n) ? n : 0
  },

  mockMap() {
    const grid = this.MOCK_GRID
    return { rows: grid.length, cols: grid[0].length, grid, solution: null }
  },
}
