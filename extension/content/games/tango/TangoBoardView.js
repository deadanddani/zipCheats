// Canvas renderer for the Tango board; self-registers into GameViews so either
// context (popup / content script) can paint it by game id.
//
// Cells hold 1=Sun (amber disc) or 2=Moon (slate crescent); givens are drawn
// solid, solved-in symbols a touch lighter. "=" / "×" links are drawn straddling
// the border between the two cells they join.
const TangoBoardView = {
  // LinkedIn's own Sun/Moon glyphs, lifted from the game's SVGs. The sun is a
  // near-full circle (31×31 viewBox); the moon is the crescent "Subtract" path
  // (28×28 viewBox). Both are drawn via Path2D, scaled to fit the cell.
  SUN_PATH:
    'M29.25 15.4989C29.25 23.0943 23.0937 29.25 15.5 29.25C7.90629 29.25 1.75 23.0943 1.75 15.4989C1.75 7.90583 7.90619 1.75 15.5 1.75C23.0938 1.75 29.25 7.90583 29.25 15.4989Z',
  SUN_VIEW: 31,
  MOON_PATH:
    'M8.10583 19.9024C15.2282 18.6466 19.2619 11.9868 17.0757 5.09295C16.8785 4.47115 16.6376 3.86915 16.3574 3.28957C16.3507 3.27584 16.3467 3.26256 16.3446 3.24986C20.5748 4.17473 24.0337 7.5648 24.8316 12.0899C25.8865 18.0727 21.8917 23.778 15.9088 24.8329C11.4675 25.616 7.17692 23.6165 4.82974 20.0826C4.84051 20.0805 4.85231 20.0796 4.86526 20.0804C5.93904 20.1476 7.02621 20.0928 8.10583 19.9024Z',
  MOON_VIEW: 28,

  // Draw an SVG path (in its own viewBox units) centred at (cx, cy), scaled so the
  // viewBox fits `size`. stroke-width is given in viewBox units, like the source SVG.
  drawSvgGlyph(ctx, path, view, cx, cy, size, { fill, stroke, strokeWidth = 2, alpha = 1 }) {
    const scale = size / view
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx - size / 2, cy - size / 2)
    ctx.scale(scale, scale)
    const p = new Path2D(path)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill(p)
    }
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = strokeWidth
      ctx.lineJoin = 'round'
      ctx.stroke(p)
    }
    ctx.restore()
  },

  draw(canvas, map) {
    const { rows, cols, grid } = map
    const size = Math.max(rows, cols)
    const dpr = window.devicePixelRatio || 1
    const cell = Math.max(20, Math.floor(252 / size))
    const pad = 6
    const w = cols * cell + pad * 2
    const h = rows * cell + pad * 2

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)

    // Cell grid lines.
    ctx.strokeStyle = '#d0d7de'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= size; i++) {
      const x = pad + i * cell + 0.5
      const y = pad + i * cell + 0.5
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + rows * cell); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cols * cell, y); ctx.stroke()
    }

    const solution = map.solution ?? null

    // Given cells get a shaded background so they read as "already placed",
    // clearly apart from cells the solver filled in.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c]) continue
        ctx.fillStyle = '#eef1f4'
        ctx.fillRect(pad + c * cell + 1, pad + r * cell + 1, cell - 1, cell - 1)
      }
    }

    // Repaint grid lines over the shaded cells so borders stay crisp.
    ctx.strokeStyle = '#d0d7de'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= size; i++) {
      const x = pad + i * cell + 0.5
      const y = pad + i * cell + 0.5
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + rows * cell); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cols * cell, y); ctx.stroke()
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const given = grid[r][c]
        const value = given || (solution ? solution[r][c] : 0)
        if (!value) continue
        const cx = pad + c * cell + cell / 2
        const cy = pad + r * cell + cell / 2
        const radius = cell * 0.3
        const solved = !given
        if (value === 1) this.drawSun(ctx, cx, cy, radius, solved)
        else this.drawMoon(ctx, cx, cy, radius, solved)
      }
    }

    for (const k of map.constraints ?? []) this.drawLink(ctx, k, cell, pad)
  },

  drawSun(ctx, cx, cy, radius, solved) {
    // Solved symbols are drawn translucent so they read as "added by the solver".
    const size = radius * 2.3
    this.drawSvgGlyph(ctx, this.SUN_PATH, this.SUN_VIEW, cx, cy, size, {
      fill: '#ffb31e',
      stroke: '#cb6c2f',
      alpha: solved ? 0.4 : 1,
    })
  },

  drawMoon(ctx, cx, cy, radius, solved) {
    const size = radius * 2.3
    this.drawSvgGlyph(ctx, this.MOON_PATH, this.MOON_VIEW, cx, cy, size, {
      fill: '#4c8ce6',
      stroke: '#1855aa',
      alpha: solved ? 0.4 : 1,
    })
  },

  // Draw the '=' / '×' badge centred on the shared border of the two cells.
  drawLink(ctx, k, cell, pad) {
    const mx = pad + ((k.c1 + k.c2) / 2 + 0.5) * cell
    const my = pad + ((k.r1 + k.r2) / 2 + 0.5) * cell
    const s = cell * 0.16

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(mx - s - 2, my - s - 2, (s + 2) * 2, (s + 2) * 2)
    ctx.strokeStyle = '#2d2a26'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    if (k.type === '=') {
      ctx.beginPath(); ctx.moveTo(mx - s, my - s / 2); ctx.lineTo(mx + s, my - s / 2)
      ctx.moveTo(mx - s, my + s / 2); ctx.lineTo(mx + s, my + s / 2); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s)
      ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s); ctx.stroke()
    }
    ctx.restore()
  },
}

GameViews.register('tango', TangoBoardView)
