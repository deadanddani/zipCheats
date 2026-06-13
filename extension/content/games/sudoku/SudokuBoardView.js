// Canvas renderer for the Sudoku board; self-registers into GameViews (bottom of
// file) so either context (popup / content script) can paint it by game id.
//
// A Sudoku map is a square grid of digits (0 = empty). We paint thin cell lines
// and thick lines between the boxes, draw the given clues in dark, and — if a
// solution is present — fill the remaining cells with it in an accent color.
const SudokuBoardView = {
  // Box dimensions [rows, cols]: 3×3 for a 9×9, 2-row×3-col for LinkedIn's 6×6.
  boxDims(size) {
    let boxRows = Math.floor(Math.sqrt(size))
    while (boxRows > 1 && size % boxRows !== 0) boxRows--
    return [boxRows, size / boxRows]
  },

  draw(canvas, map) {
    const { rows, cols, grid } = map
    const size = Math.max(rows, cols)
    const [boxRows, boxCols] = this.boxDims(size)
    const dpr = window.devicePixelRatio || 1
    const cell = Math.max(16, Math.floor(252 / size))
    const pad = 6
    const w = cols * cell + pad * 2
    const h = rows * cell + pad * 2

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#faf7f2'
    ctx.fillRect(0, 0, w, h)

    // Thin grid lines.
    ctx.strokeStyle = 'rgba(45,42,38,0.35)'
    ctx.lineWidth = 1
    for (let i = 0; i <= size; i++) {
      const x = pad + i * cell + 0.5
      const y = pad + i * cell + 0.5
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + rows * cell); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cols * cell, y); ctx.stroke()
    }

    // Thick lines between boxes (and the outer frame): every boxCols vertically,
    // every boxRows horizontally.
    ctx.strokeStyle = '#2d2a26'
    ctx.lineWidth = 2.5
    for (let i = 0; i <= size; i += boxCols) {
      const x = pad + i * cell
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + rows * cell); ctx.stroke()
    }
    for (let i = 0; i <= size; i += boxRows) {
      const y = pad + i * cell
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cols * cell, y); ctx.stroke()
    }

    // Digits: givens in dark, solved-in digits (if any) in accent.
    const solution = map.solution ?? null
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 ${Math.floor(cell * 0.55)}px -apple-system, "Segoe UI", system-ui, sans-serif`
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const given = grid[r][c]
        const value = given || (solution ? solution[r][c] : 0)
        if (!value) continue
        ctx.fillStyle = given ? '#2d2a26' : '#1a9d4b'
        const cx = pad + c * cell + cell / 2
        const cy = pad + r * cell + cell / 2
        ctx.fillText(String(value), cx, cy)
      }
    }
  },
}

GameViews.register('sudoku', SudokuBoardView)
