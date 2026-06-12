// Zip's board renderer — implements the GameView contract (draw(canvas, map)).
// A custom canvas render of the board (no DOM grid), used by both the in-page
// banner and the popup. Loaded as a classic script in both contexts; it
// self-registers into GameViews so either side can paint Zip by game id.
const ZipBoardView = {
  // Custom canvas render of the board: filled cells, thin grid lines, thick
  // yellow walls, and numbered nodes drawn as blue chips.
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

    // Cells + thin separators.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * cell
        const y = pad + r * cell
        ctx.fillStyle = '#141c23'
        ctx.fillRect(x, y, cell, cell)
        ctx.strokeStyle = '#243039'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      }
    }

    // Walls: thick yellow segments on the cell edges that carry them.
    ctx.strokeStyle = '#f5c518'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const { walls } = grid[r][c]
        const x = pad + c * cell
        const y = pad + r * cell
        ctx.beginPath()
        if (walls.top) (ctx.moveTo(x, y), ctx.lineTo(x + cell, y))
        if (walls.right) (ctx.moveTo(x + cell, y), ctx.lineTo(x + cell, y + cell))
        if (walls.bottom) (ctx.moveTo(x, y + cell), ctx.lineTo(x + cell, y + cell))
        if (walls.left) (ctx.moveTo(x, y), ctx.lineTo(x, y + cell))
        ctx.stroke()
      }
    }

    // Numbered nodes as blue chips with white digits.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${Math.floor(cell * 0.46)}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c].value
        if (v == null) continue
        const cx = pad + c * cell + cell / 2
        const cy = pad + r * cell + cell / 2
        ctx.beginPath()
        ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2)
        ctx.fillStyle = '#0a66c2'
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(String(v), cx, cy)
      }
    }
  },
}

GameViews.register('zip', ZipBoardView)
