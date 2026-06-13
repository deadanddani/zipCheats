// Replays a solved Tango board onto LinkedIn's grid.
//
// Cells are addressed by `data-cell-idx` (idx = row * cols + col), same as Queens.
// Each cell's inner <svg> carries a data-testid that reflects its state:
//   cell-empty → empty,  cell-zero → Sun (1),  cell-one → Moon (2).
// Clicking a cell cycles empty → Sun → Moon → empty, so we click until the cell
// shows the symbol we want rather than assuming a fixed click count.
const TangoPlayer = {
  MAX_WAIT_MS: 120,
  // Cycle has 3 states (empty → Sun → Moon), so ≥3 clicks reach any target.
  MAX_CLICKS_PER_CELL: 4,

  TESTID: { 1: 'cell-zero', 2: 'cell-one' }, // value → target svg data-testid

  cellEl(idx) {
    return document.querySelector(`[data-cell-idx="${idx}"]`);
  },

  // 'cell-empty' | 'cell-zero' | 'cell-one' | null for the cell's current symbol.
  symbolTestid(el) {
    return el?.querySelector('svg[data-testid]')?.getAttribute('data-testid') ?? null;
  },

  hasValue(el, value) {
    return this.symbolTestid(el) === this.TESTID[value];
  },

  clickCell(el) {
    const r = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
    };
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      const Ctor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, { ...opts, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    }
  },

  async play(solution, { completeMap, map }) {
    if (!Array.isArray(solution) || !solution.length) {
      console.warn('[hackTheLink] Tango: empty solution, nothing to play');
      return;
    }

    const givens = map?.grid ?? [];
    const cols = map?.cols ?? solution[0]?.length ?? 0;
    const rows = solution.length;

    // Fill only the cells LinkedIn left empty; givens are already locked in.
    const toFill = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!givens[r]?.[c]) toFill.push({ row: r, col: c, value: solution[r][c] });
      }
    }

    // completeMap=false stops one symbol short, leaving the puzzle unfinished.
    const targets = completeMap ? toFill : toFill.slice(0, -1);

    let placed = 0;
    for (const { row, col, value } of targets) {
      const idx = row * cols + col;
      const el = this.cellEl(idx);
      if (!el) {
        console.warn(`[hackTheLink] Tango: cell ${idx} (r${row},c${col}) not found`);
        continue;
      }
      if (await this.ensureValue(el, value)) placed++;
      else console.warn(`[hackTheLink] Tango: could not set cell ${idx} (r${row},c${col})`);
    }

    console.log(`[hackTheLink] Tango: placed ${placed}/${targets.length} symbols (completeMap=${completeMap})`);
  },

  // Click the cell until it shows the desired symbol (cycling through states).
  async ensureValue(el, value) {
    for (let click = 0; click < this.MAX_CLICKS_PER_CELL; click++) {
      if (this.hasValue(el, value)) return true;
      const before = el.innerHTML;
      this.clickCell(el);
      await this.waitForChange(el, before);
    }
    return this.hasValue(el, value);
  },

  // Resolves once the click lands (content changed) or MAX_WAIT_MS elapses; the
  // sync check first catches React flushing the click immediately.
  waitForChange(el, before) {
    if (el.innerHTML !== before) return Promise.resolve();
    return new Promise((resolve) => {
      const deadline = performance.now() + this.MAX_WAIT_MS;
      const check = () => {
        if (el.innerHTML !== before || performance.now() >= deadline) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },
};
