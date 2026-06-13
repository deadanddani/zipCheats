// Places the solved crowns onto LinkedIn's Queens board. Cells are addressed by
// `data-cell-idx` (idx = row * cols + col, 0-based, wrapping each row).
const QueensPlayer = {
  MAX_WAIT_MS: 120,
  // The click cycle has 3 states (empty → ✕ → 👑), so ≥3 reaches a crown from any start.
  MAX_CLICKS_PER_CELL: 4,

  cellEl(idx) {
    return document.querySelector(`[data-cell-idx="${idx}"]`);
  },

  isQueen(el) {
    return !!el?.querySelector('[data-testid="queen-svg"]');
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

  // completeMap=false stops one crown short, leaving the puzzle drawn but unfinished.
  async play(solution, { completeMap, map }) {
    if (!Array.isArray(solution) || solution.length === 0) {
      console.warn('[hackTheLink] Queens: empty solution, nothing to play');
      return;
    }

    await this.clearBoard();

    const cols = map.cols;
    const queens = completeMap ? solution : solution.slice(0, -1);

    let placed = 0;
    for (const { row, col } of queens) {
      const idx = row * cols + col;
      const el = this.cellEl(idx);
      if (!el) {
        console.warn(`[hackTheLink] Queens: cell ${idx} (r${row},c${col}) not found`);
        continue;
      }
      if (await this.ensureCrown(el)) placed++;
      else console.warn(`[hackTheLink] Queens: could not crown cell ${idx} (r${row},c${col})`);
    }

    console.log(`[hackTheLink] Queens: placed ${placed}/${queens.length} crowns (completeMap=${completeMap})`);
  },

  // Clear any pre-existing crowns so our clicks build the board from scratch.
  async clearBoard() {
    const queenCells = [...document.querySelectorAll('[data-testid="queen-svg"]')]
      .map((svg) => svg.closest('[data-cell-idx]'))
      .filter((el) => el);
    for (const el of queenCells) {
      for (let click = 0; this.isQueen(el) && click < this.MAX_CLICKS_PER_CELL; click++) {
        const before = el.innerHTML;
        this.clickCell(el);
        await this.waitForChange(el, before);
      }
    }
    if (queenCells.length) console.log(`[hackTheLink] Queens: cleared ${queenCells.length} existing crowns`);
  },

  async ensureCrown(el) {
    for (let click = 0; click < this.MAX_CLICKS_PER_CELL; click++) {
      if (this.isQueen(el)) return true;
      const before = el.innerHTML;
      this.clickCell(el);
      await this.waitForChange(el, before);
    }
    return this.isQueen(el);
  },

  // Resolves once the click lands (crown shown or content changed) or MAX_WAIT_MS
  // elapses; the sync check first catches React flushing the click immediately.
  waitForChange(el, before) {
    if (this.isQueen(el) || el.innerHTML !== before) return Promise.resolve();
    return new Promise((resolve) => {
      const deadline = performance.now() + this.MAX_WAIT_MS;
      const check = () => {
        if (this.isQueen(el) || el.innerHTML !== before || performance.now() >= deadline) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },
};
