// Replays the solved Patches partition onto LinkedIn's board.
//
// Captured interaction model: regions are painted by *dragging*. A pointerdown
// on a cell that already belongs to a region, followed by pointermoves over
// other cells while the button is held, paints those cells into that region; a
// pointerup ends the stroke. The colour is anchored by the start cell — and a
// region's clue cell always belongs to its region from the start — so we begin
// each stroke on the clue cell and drag through the rest of the region's cells.
//
// A painted cell's aria-label becomes "…en región con pista en fila R, columna C".
const PatchesPlayer = {
  cellEl(idx) {
    return document.querySelector(`[data-cell-idx="${idx}"]`)
      ?? document.querySelector(`[data-testid="cell-${idx}"]`)
  },

  // Real-time gap between drag steps. The board samples the pointer on its own
  // rAF loop, so moves fired in one frame look like a plain click — we must
  // spread them out in wall-clock time.
  STEP_MS: 28,
  STROKE_GAP_MS: 90,

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  // Dispatch a pointer/mouse event centred on `el`. `buttons` is the held-button
  // bitmask (1 while dragging), `button` the changed button (0 = primary, -1 = none).
  fire(el, type, { buttons = 0, button = 0, relatedTarget = null } = {}) {
    const r = el.getBoundingClientRect()
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
      button,
      buttons,
    }
    if (relatedTarget) base.relatedTarget = relatedTarget
    if (type.startsWith('pointer')) {
      el.dispatchEvent(new PointerEvent(type, { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
    } else {
      el.dispatchEvent(new MouseEvent(type, base))
    }
  },

  // Order a region's cells into a connected path starting at the clue cell:
  // greedily hop to an orthogonal neighbour, falling back to the nearest cell
  // when the current run dead-ends. Mimics a continuous drag.
  orderRegion(cells, anchorIdx, cols) {
    const remaining = new Set(cells.map((c) => c.idx))
    const order = []
    let cur = remaining.has(anchorIdx) ? anchorIdx : cells[0]?.idx
    while (cur != null && remaining.size) {
      remaining.delete(cur)
      order.push(cur)
      const r = Math.floor(cur / cols)
      const c = cur % cols
      const candidates = [cur - cols, cur + cols, c > 0 ? cur - 1 : null, c < cols - 1 ? cur + 1 : null]
      let next = candidates.find((n) => n != null && remaining.has(n)) ?? null
      if (next == null) {
        let best = Infinity
        for (const n of remaining) {
          const d = Math.abs(Math.floor(n / cols) - r) + Math.abs((n % cols) - c)
          if (d < best) { best = d; next = n }
        }
      }
      cur = next
    }
    return order
  },

  // One drag stroke over an ordered list of cell indices. Moves are spread out
  // in real time and emitted as faithful out/over/move pairs so the board's
  // enter/leave tracking follows the pointer. No trailing click — a click would
  // toggle the cell back off.
  async paintStroke(order) {
    let prev = this.cellEl(order[0])
    if (!prev) return 0
    this.fire(prev, 'pointerover', { buttons: 1 })
    this.fire(prev, 'pointerenter', { buttons: 1 })
    this.fire(prev, 'pointerdown', { buttons: 1, button: 0 })
    this.fire(prev, 'mousedown', { buttons: 1, button: 0 })
    this.fire(prev, 'pointermove', { buttons: 1, button: -1 })
    await this.sleep(this.STEP_MS)

    let painted = 1
    for (let i = 1; i < order.length; i++) {
      const el = this.cellEl(order[i])
      if (!el) continue
      this.fire(prev, 'pointerout', { buttons: 1, relatedTarget: el })
      this.fire(prev, 'pointerleave', { buttons: 1, relatedTarget: el })
      this.fire(el, 'pointerover', { buttons: 1, relatedTarget: prev })
      this.fire(el, 'pointerenter', { buttons: 1, relatedTarget: prev })
      this.fire(el, 'pointermove', { buttons: 1, button: -1 })
      prev = el
      painted++
      await this.sleep(this.STEP_MS)
    }

    this.fire(prev, 'pointerup', { buttons: 0, button: 0 })
    this.fire(prev, 'mouseup', { buttons: 0, button: 0 })
    await this.sleep(this.STROKE_GAP_MS)
    return painted
  },

  async play(solution, { completeMap, map }) {
    const regions = map?.regions ?? []
    const cols = map?.cols
    if (!regions.length || !cols) {
      console.warn('[hackTheLink] Patches: no regions, nothing to play')
      return
    }

    // region index → its clue cell idx (the colour anchor for the stroke).
    const clueByRegion = new Map(
      (map.clues ?? []).filter((c) => c.region >= 0).map((c) => [c.region, c.idx]),
    )

    const plans = regions.map((rg) => {
      const anchor = clueByRegion.get(rg.index) ?? rg.cells[0]?.idx
      return this.orderRegion(rg.cells, anchor, cols)
    })

    // completeMap=false leaves the puzzle one cell short, for testing.
    if (!completeMap) {
      const last = plans[plans.length - 1]
      if (last && last.length > 1) last.pop()
    }

    let painted = 0
    for (const order of plans) painted += await this.paintStroke(order)

    console.log(`[hackTheLink] Patches: painted ${painted} cells across ${plans.length} regions (completeMap=${completeMap})`)
  },
}
