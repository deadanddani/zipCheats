// Canvas renderer for the Queens board; self-registers into GameViews so either
// context (popup / content script) can paint it by game id.
const QueensBoardView = {
  REGION_COLORS: [
    '#f7a4a4', '#a8d5a2', '#a9c7f0', '#f6d488', '#c8a8e0',
    '#88d4d4', '#f0b088', '#d4d488', '#e0a8c8', '#a8e0c0',
    '#c0c0c0', '#f0a0c0',
  ],

  regionColor(region) {
    return this.REGION_COLORS[region % this.REGION_COLORS.length]
  },

  draw(canvas, map) {
    const { rows, cols, grid } = map
    const dpr = window.devicePixelRatio || 1
    const cell = Math.max(16, Math.floor(224 / Math.max(rows, cols)))
    const pad = 5
    const w = cols * cell + pad * 2
    const h = rows * cell + pad * 2

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#0b1116'
    ctx.fillRect(0, 0, w, h)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * cell
        const y = pad + r * cell
        ctx.fillStyle = this.regionColor(grid[r][c])
        ctx.fillRect(x, y, cell, cell)
        ctx.strokeStyle = 'rgba(11,17,22,0.25)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      }
    }

    // Thick borders where neighbouring regions differ, so region shapes read clearly.
    ctx.strokeStyle = '#0b1116'
    ctx.lineWidth = 2.5
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const region = grid[r][c]
        const x = pad + c * cell
        const y = pad + r * cell
        ctx.beginPath()
        if (r === 0 || grid[r - 1][c] !== region) (ctx.moveTo(x, y), ctx.lineTo(x + cell, y))
        if (r === rows - 1 || grid[r + 1][c] !== region) (ctx.moveTo(x, y + cell), ctx.lineTo(x + cell, y + cell))
        if (c === 0 || grid[r][c - 1] !== region) (ctx.moveTo(x, y), ctx.lineTo(x, y + cell))
        if (c === cols - 1 || grid[r][c + 1] !== region) (ctx.moveTo(x + cell, y), ctx.lineTo(x + cell, y + cell))
        ctx.stroke()
      }
    }

    // solution items are {row, col} or a flat cell index (row * cols + col).
    const queens = map.solution ?? []
    if (queens.length) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.floor(cell * 0.6)}px -apple-system, "Segoe UI", system-ui, sans-serif`
      // Gold fill with a black outline so the crown reads on any pastel region.
      ctx.fillStyle = '#f5c518'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = Math.max(1.5, cell * 0.05)
      ctx.lineJoin = 'round'
      for (const q of queens) {
        const row = typeof q === 'number' ? Math.floor(q / cols) : q.row
        const col = typeof q === 'number' ? q % cols : q.col
        const cx = pad + col * cell + cell / 2
        const cy = pad + row * cell + cell / 2
        ctx.strokeText('♛', cx, cy)
        ctx.fillText('♛', cx, cy)
      }
    }
  },
}

GameViews.register('queens', QueensBoardView)
