// Types a solved Sudoku board onto LinkedIn's grid.
//
// Cells are `.sudoku-cell[data-cell-idx]` (idx = row * cols + col); the digit
// lives in `.sudoku-cell-content`. Input is: click the cell to select it, then
// click the matching button on the number pad (a `<button>` whose text is the
// digit). We read the cell back to confirm and retry a couple of times.
const SudokuPlayer = {
  MAX_WAIT_MS: 150,
  MAX_ATTEMPTS: 3,

  cellEl(idx) {
    return document.querySelector(`.sudoku-cell[data-cell-idx="${idx}"]`)
      ?? document.querySelector(`[data-cell-idx="${idx}"]`);
  },

  cellText(el) {
    return (el?.querySelector('.sudoku-cell-content')?.textContent ?? el?.textContent ?? '').trim();
  },

  // Map digit → its number-pad button, by exact button text (1..size).
  digitButtons(size) {
    const map = new Map();
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      const t = b.textContent.trim();
      if (/^[1-9]$/.test(t) && +t >= 1 && +t <= size && !map.has(+t)) map.set(+t, b);
    }
    return map;
  },

  clickEl(el) {
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

  async play(solution, { completeMap, map, solveSeconds = 0, elapsedAnchor = null }) {
    if (!Array.isArray(solution) || !solution.length) {
      console.warn('[hackTheLink] Sudoku: empty solution, nothing to play');
      return;
    }

    const givens = map?.grid ?? [];
    const rows = solution.length;
    const cols = map?.cols ?? solution[0]?.length ?? 0;
    const pad = this.digitButtons(cols);
    if (!pad.size) console.warn('[hackTheLink] Sudoku: number pad not found — input may fail');

    // Only the cells the solver filled in (skip the puzzle's clues).
    const toFill = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!givens[r]?.[c]) toFill.push({ row: r, col: c, value: solution[r][c] });
      }
    }

    const { placed, total } = await Pacer.play(toFill, { completeMap, solveSeconds, elapsedAnchor }, async ({ row, col, value }) => {
      const idx = row * cols + col;
      const el = this.cellEl(idx);
      if (!el) {
        console.warn(`[hackTheLink] Sudoku: cell ${idx} (r${row},c${col}) not found`);
        return false;
      }
      if (await this.setDigit(el, value, pad.get(value))) return true;
      console.warn(`[hackTheLink] Sudoku: could not set cell ${idx} (r${row},c${col}) = ${value}`);
      return false;
    });

    console.log(`[hackTheLink] Sudoku: placed ${placed}/${total} digits (completeMap=${completeMap})`);
  },

  // Click the cell, then the digit button; confirm by reading the cell back.
  async setDigit(el, value, btn) {
    const want = String(value);
    for (let attempt = 0; attempt < this.MAX_ATTEMPTS; attempt++) {
      if (this.cellText(el) === want) return true;
      this.clickEl(el);
      if (btn) this.clickEl(btn);
      else await this.typeKey(el, want); // fallback if no number pad
      await this.waitFor(() => this.cellText(el) === want);
    }
    return this.cellText(el) === want;
  },

  // Fallback input path: dispatch a keydown for the digit on the selected cell.
  async typeKey(el, digit) {
    const opts = { bubbles: true, cancelable: true, key: digit, code: `Digit${digit}`, keyCode: 48 + +digit };
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
  },

  waitFor(done) {
    if (done()) return Promise.resolve();
    return new Promise((resolve) => {
      const deadline = performance.now() + this.MAX_WAIT_MS;
      const check = () => {
        if (done() || performance.now() >= deadline) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },
};
