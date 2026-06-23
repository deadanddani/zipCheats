// Fetches the Tango puzzle from LinkedIn, mirroring ZipExtractor. The endpoint
// returns HTML with the puzzle embedded in its RSC payload under
// `lotkaGamePuzzle` (Tango's internal codename is "Lotka"):
//
//   { gridSize: 6,
//     presetCellIdxes: [19, 20, ...],              // flat idx of the given cells
//     edges: [{ startIdx, endIdx, isEqual }, ...],  // links between two cells
//     solution: ["LotkaCellValue_ZERO", ...] }      // n*n, value of every cell
//
// A given cell's value is read from `solution` at the same index. Unlike Zip /
// Queens, this payload escapes its quotes as HTML entities (&quot;) rather than
// backslashes, so parsePuzzle decodes entities too.
//
// Map shape: { rows, cols, grid (0=empty,1=Sun,2=Moon, givens only),
//              constraints: [{ r1, c1, r2, c2, type: '=' | 'x' }], solution }.
const TangoExtractor = {
  endpoint: 'https://www.linkedin.com/flagship-web/games/tango/',

  KEY: 'lotkaGamePuzzle',

  // A solvable 6×6 mock (0 = empty). Used only if the fetch/parse fails.
  MOCK_GRID: [
    [0, 0, 2, 0, 0, 0],
    [0, 1, 0, 0, 2, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 2, 0, 0, 0],
    [0, 2, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0],
  ],

  MOCK_CONSTRAINTS: [
    { r1: 0, c1: 0, r2: 0, c2: 1, type: '=' },
    { r1: 2, c1: 4, r2: 2, c2: 5, type: 'x' },
    { r1: 4, c1: 2, r2: 5, c2: 2, type: '=' },
  ],

  async extract() {
    try {
      const puzzle = await this.fetchPuzzle()
      console.log('[hackTheLink] lotkaGamePuzzle raw payload:', puzzle)
      const map = this.toMap(puzzle)
      if (map) return map
      console.warn('[hackTheLink] Could not map lotkaGamePuzzle yet — using mock board')
    } catch (err) {
      console.warn('[hackTheLink] Tango fetch/parse failed, using mock board:', err)
    }
    return this.mockMap()
  },

  async fetchPuzzle() {
    // The loaded page already embeds the puzzle (it's what the board renders
    // from), so try the DOM first — a string scan, no network. Fall back to a
    // same-origin fetch (e.g. after an SPA navigation that didn't reload).
    try {
      const puzzle = this.parsePuzzle(domPayload())
      console.log('[hackTheLink] Tango: puzzle read from DOM (no fetch)')
      return puzzle
    } catch {}
    console.log('[hackTheLink] Tango: puzzle not in DOM, fetching endpoint')
    const res = await fetch(this.endpoint, { credentials: 'include' })
    if (!res.ok) throw new Error(`Tango endpoint returned ${res.status}`)
    return this.parsePuzzle(await res.text())
  },

  // Brace-depth scan finds the object regardless of escaping (braces are never
  // escaped); then peel HTML entities + backslash layers until JSON.parse works.
  parsePuzzle(html) {
    const at = html.indexOf(this.KEY)
    if (at === -1) throw new Error(`${this.KEY} not found in payload`)

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
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        return JSON.parse(raw)
      } catch {
        raw = this.decodeEntities(raw).replace(/\\(.)/g, '$1') // peel one layer
      }
    }
    throw new Error(`could not parse ${this.KEY} JSON`)
  },

  // Decode the HTML entities LinkedIn uses in this payload. &amp; is decoded last
  // so nested layers (&amp;quot; → &quot; → ") peel one step per attempt.
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
    const n = puzzle?.gridSize
    const solution = puzzle?.solution
    if (!n || !Array.isArray(solution) || solution.length !== n * n) return null

    // Full solved grid (2D), then the given board with only preset cells filled.
    const solved = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => this.toSymbol(solution[r * n + c])),
    )
    const grid = Array.from({ length: n }, () => new Array(n).fill(0))
    for (const idx of puzzle.presetCellIdxes ?? []) {
      const r = Math.floor(idx / n)
      const c = idx % n
      if (solved[r]) grid[r][c] = solved[r][c]
    }

    return { rows: n, cols: n, grid, constraints: this.extractConstraints(puzzle, n), solution: solved }
  },

  // 'LotkaCellValue_ZERO' → 1 (Sun), 'LotkaCellValue_ONE' → 2 (Moon). The exact
  // Sun/Moon assignment is arbitrary as long as it's consistent end to end.
  toSymbol(v) {
    if (v === 1 || v === 2) return v
    if (typeof v === 'string') {
      if (v.includes('ZERO') || v.endsWith('_0')) return 1
      if (v.includes('ONE') || v.endsWith('_1')) return 2
    }
    return 0
  },

  // edges: [{ startIdx, endIdx, isEqual }] between two cells (flat indices).
  extractConstraints(puzzle, n) {
    const edges = puzzle?.edges
    if (!Array.isArray(edges)) return []
    return edges
      .filter((e) => Number.isInteger(e?.startIdx) && Number.isInteger(e?.endIdx))
      .map((e) => ({
        r1: Math.floor(e.startIdx / n),
        c1: e.startIdx % n,
        r2: Math.floor(e.endIdx / n),
        c2: e.endIdx % n,
        type: e.isEqual ? '=' : 'x',
      }))
  },

  mockMap() {
    const grid = this.MOCK_GRID
    return { rows: grid.length, cols: grid[0].length, grid, constraints: this.MOCK_CONSTRAINTS, solution: null }
  },
}
