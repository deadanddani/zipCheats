// Canvas renderer for the Patches board; self-registers into GameViews so either
// context (popup / content script) can paint it by game id.
//
// Each region ("patch") is filled with its own colour; thick borders separate
// different regions. Clue cells are marked: a square glyph for SQUARE clues, the
// cell count for the rest.
const PatchesBoardView = {
  // A palette with enough distinct hues for the ~10 regions of an 8×8 board.
  PALETTE: [
    '#E40101', '#0097A7', '#7CB342', '#F9A825', '#8E24AA',
    '#5C6BC0', '#D81B60', '#00897B', '#6D4C41', '#C0CA33',
    '#3949AB', '#43A047', '#FB8C00', '#00ACC1', '#AD1457',
  ],

  draw(canvas, map) {
    const { rows, cols, regionGrid } = map
    const size = Math.max(rows, cols)
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

    // Fill each cell with its region colour (softened so clue glyphs stay legible).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const region = regionGrid[r]?.[c]
        if (region == null || region < 0) continue
        ctx.globalAlpha = 0.55
        ctx.fillStyle = this.PALETTE[region % this.PALETTE.length]
        ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell)
        ctx.globalAlpha = 1
      }
    }

    // Thin grid lines.
    ctx.strokeStyle = 'rgba(45,42,38,0.18)'
    ctx.lineWidth = 1
    for (let i = 0; i <= size; i++) {
      const x = pad + i * cell + 0.5
      const y = pad + i * cell + 0.5
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + rows * cell); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cols * cell, y); ctx.stroke()
    }

    // Thick borders wherever two adjacent cells belong to different regions.
    ctx.strokeStyle = '#2d2a26'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const here = regionGrid[r]?.[c]
        const x = pad + c * cell
        const y = pad + r * cell
        if (c + 1 >= cols || regionGrid[r]?.[c + 1] !== here) {
          ctx.beginPath(); ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); ctx.stroke()
        }
        if (c === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cell); ctx.stroke() }
        if (r + 1 >= rows || regionGrid[r + 1]?.[c] !== here) {
          ctx.beginPath(); ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); ctx.stroke()
        }
        if (r === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cell, y); ctx.stroke() }
      }
    }

    // Clue markers.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${Math.floor(cell * 0.5)}px -apple-system, "Segoe UI", system-ui, sans-serif`
    for (const clue of map.clues ?? []) {
      const cx = pad + clue.col * cell + cell / 2
      const cy = pad + clue.row * cell + cell / 2
      const g = cell * 0.32

      // White disc so the glyph reads over any region colour.
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath(); ctx.arc(cx, cy, g + 3, 0, Math.PI * 2); ctx.fill()

      ctx.fillStyle = '#2d2a26'
      ctx.strokeStyle = '#2d2a26'
      if (clue.shape === 'square') {
        ctx.lineWidth = 2
        ctx.strokeRect(cx - g * 0.7, cy - g * 0.7, g * 1.4, g * 1.4)
      } else {
        ctx.fillText(String(clue.number), cx, cy + 1)
      }
    }
  },
}

GameViews.register('patches', PatchesBoardView)
