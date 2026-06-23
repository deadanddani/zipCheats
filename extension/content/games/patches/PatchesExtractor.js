// Fetches LinkedIn's "Patches" puzzle from its RSC payload under
// `patchesGamePuzzle`. The key appears several times in the HTML (schema /
// model blocks first), so we scan every occurrence and keep the one that
// actually carries puzzle data:
//
//   { gridRows: 8, gridCols: 8,
//     clueCells: [{ cellIdx, shapeConstraint, numberConstraint }, ...],
//     solution:  [{ cellIdxes: [...] }, ...] }   // each entry = one region
//
// Patches = partition the grid into regions ("patches"), each holding one clue:
//   SQUARE clue  → the region is a square (numberConstraint 0; size deduced),
//   otherwise    → numberConstraint = how many cells the region has.
// `solution` already gives the full partition, so there is nothing to solve.
//
// Quotes are HTML-entity escaped (&quot;), so parsing decodes entities too.
const PatchesExtractor = {
  endpoint: 'https://www.linkedin.com/flagship-web/games/patches/',

  KEY: 'patchesGamePuzzle',

  async extract() {
    try {
      const puzzle = await this.fetchPuzzle()
      console.log('[hackTheLink] patchesGamePuzzle raw payload:', puzzle)
      const map = this.toMap(puzzle)
      if (map) return map
      console.warn('[hackTheLink] Could not map patchesGamePuzzle')
    } catch (err) {
      console.warn('[hackTheLink] Patches fetch/parse failed:', err)
    }
    return null
  },

  async fetchPuzzle() {
    // The loaded page already embeds the puzzle (it's what the board renders
    // from), so try the DOM first — a string scan, no network. Fall back to a
    // same-origin fetch (e.g. after an SPA navigation that didn't reload).
    try {
      const puzzle = this.parsePuzzle(document.documentElement.outerHTML)
      console.log('[hackTheLink] Patches: puzzle read from DOM (no fetch)')
      return puzzle
    } catch {}
    console.log('[hackTheLink] Patches: puzzle not in DOM, fetching endpoint')
    const res = await fetch(this.endpoint, { credentials: 'include' })
    if (!res.ok) throw new Error(`Patches endpoint returned ${res.status}`)
    return this.parsePuzzle(await res.text())
  },

  // The data object is the occurrence carrying both `solution` and `clueCells`
  // arrays (earlier occurrences are schema/model definitions).
  parsePuzzle(html) {
    let at = html.indexOf(this.KEY)
    while (at !== -1) {
      const obj = this.objectAt(html, at + this.KEY.length)
      if (obj && Array.isArray(obj.solution) && Array.isArray(obj.clueCells)) return obj
      at = html.indexOf(this.KEY, at + 1)
    }
    throw new Error(`no ${this.KEY} object with data found in payload`)
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
    const rows = puzzle?.gridRows
    const cols = puzzle?.gridCols
    const solution = puzzle?.solution
    if (!rows || !cols || !Array.isArray(solution)) return null

    // regionGrid[r][c] = index of the region that owns the cell (-1 if none).
    const regionGrid = Array.from({ length: rows }, () => new Array(cols).fill(-1))
    const regions = solution.map((region, ri) => {
      const idxes = region?.cellIdxes ?? []
      const cells = idxes.map((idx) => {
        const r = Math.floor(idx / cols)
        const c = idx % cols
        if (regionGrid[r]) regionGrid[r][c] = ri
        return { row: r, col: c, idx }
      })
      return { index: ri, cells, size: cells.length }
    })

    const clues = (puzzle.clueCells ?? []).map((clue) => {
      const idx = clue.cellIdx
      const r = Math.floor(idx / cols)
      const c = idx % cols
      return {
        idx,
        row: r,
        col: c,
        shape: clue.shapeConstraint === 'PatchesShapeConstraint_SQUARE' ? 'square' : 'free',
        number: clue.numberConstraint ?? 0,
        region: regionGrid[r]?.[c] ?? -1,
      }
    })

    return { rows, cols, regions, regionGrid, clues, solution: regionGrid }
  },
}
