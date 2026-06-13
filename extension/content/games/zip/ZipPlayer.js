// Replays a solved path onto LinkedIn's board. The board is keyboard-navigable
// (the start cell has role=button/tabindex and a directional hint arrow, with a
// "connected/not-connected" live region), so instead of faking a pointer drag —
// which fails against the board's pointer-capture / coordinate hit-testing — we
// focus the start cell and press arrow keys, one per step.
//
// The board is React: each keydown updates its state and moves focus to the new
// head *asynchronously*. Firing the whole trail in one tick therefore only lands
// the first move. Instead of sleeping a fixed amount between keys, we press a key
// and then wait only until the move is *confirmed* (the destination cell becomes
// part of the trail / gets focus), so each step costs as little as the board
// actually needs — often a single frame, sometimes zero.
const ZipPlayer = {
  // Hard cap on how long to wait for one move to be confirmed before giving up
  // and pressing the next key anyway. Keeps a wrong/absent signal from stalling.
  MAX_WAIT_MS: 32,
  // LinkedIn's internal game-type id for Zip (codename "trail"), used to find
  // this puzzle's persisted state in localStorage.
  GAME_TYPE: 6,
  // delta "dRow,dCol" -> the arrow key that moves there
  KEY: {
    "-1,0": { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    "1,0": { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    "0,-1": { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    "0,1": { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  },

  cellEl(idx) {
    return document.querySelector(`[data-cell-idx="${idx}"]`);
  },

  fireKey(target, spec) {
    for (const type of ["keydown", "keyup"]) {
      const e = new KeyboardEvent(type, {
        key: spec.key,
        code: spec.code,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      // keyCode / which are read-only and ignored by the constructor; force them
      // so any legacy handlers that still read them see the right value.
      Object.defineProperty(e, "keyCode", { get: () => spec.keyCode });
      Object.defineProperty(e, "which", { get: () => spec.keyCode });
      target.dispatchEvent(e);
    }
  },

  // Reads how many seconds LinkedIn already has on the clock for the in-progress
  // Zip puzzle. The state lives in localStorage under a key shaped like
  // `play:urn:li:fsd_game:(<member>,6,<puzzle>)`, whose `data` is a JSON string
  // holding `{ gamePlayState, timeElapsed, ... }`. Returns null if not found.
  readElapsedSeconds() {
    const keyRe = new RegExp(`^play:urn:li:fsd_game:\\([^,]+,${this.GAME_TYPE},\\d+\\)$`);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!keyRe.test(k)) continue;
      try {
        const data = JSON.parse(JSON.parse(localStorage.getItem(k)).data);
        if (data.gamePlayState === "IN_PROGRESS" && Number.isFinite(data.timeElapsed)) {
          return data.timeElapsed;
        }
      } catch {
        /* skip malformed entries */
      }
    }
    return null;
  },

  // Blocks until the game's live elapsed time reaches `targetSeconds`, so the
  // finishing move lands at the configured completion time. The clock starts at
  // puzzle load, so we extrapolate from the anchor captured then; if we're
  // already past the target there's nothing to wait for.
  async waitUntilElapsed(targetSeconds, anchor) {
    const target = Math.max(0, targetSeconds);
    const ref = anchor ?? { at: Date.now(), base: 0 };
    const liveElapsed = () => ref.base + (Date.now() - ref.at) / 1000;
    while (liveElapsed() < target) {
      await new Promise((r) => setTimeout(r, 80));
    }
  },

  // completeMap=false stops one move short so the puzzle is drawn but not finished.
  async play(solution, { completeMap, map, solveSeconds = 0, elapsedAnchor = null }) {
    const path = solution;
    const cols = map.cols;
    const cells = completeMap ? path : path.slice(0, -1);
    if (cells.length < 2) {
      console.warn("[hackTheLink] Path too short to play");
      return;
    }

    const start = this.cellEl(cells[0]);
    if (!start) {
      console.warn("[hackTheLink] Could not find start cell");
      return;
    }

    const grid = document.querySelector("[data-trail-grid]") ?? document.body;

    // If the board already has a partial trail (e.g. resuming a puzzle), clear
    // it first — otherwise our arrow presses would extend the old path instead
    // of drawing ours from the start.
    await this.resetIfNeeded(start);

    start.focus();

    for (let i = 1; i < cells.length; i++) {
      const dr = Math.floor(cells[i] / cols) - Math.floor(cells[i - 1] / cols);
      const dc = (cells[i] % cols) - (cells[i - 1] % cols);
      const spec = this.KEY[`${dr},${dc}`];
      if (!spec) {
        console.warn(`[hackTheLink] Non-adjacent step ${i} (d=${dr},${dc})`);
        continue;
      }
      // When actually finishing, hold the last (completing) move until the
      // game's clock reaches the configured time, so LinkedIn records ~that.
      if (completeMap && i === cells.length - 1) {
        await this.waitUntilElapsed(solveSeconds, elapsedAnchor);
      }
      // re-focus the current head each step: the game moves focus to the newly
      // connected cell, and targeting it keeps the next arrow acting on the head.
      const head = this.cellEl(cells[i - 1]);
      const target = head && document.activeElement !== head ? (head.focus(), head) : (document.activeElement ?? grid);
      this.fireKey(target, spec);
      await this.waitForMove(this.cellEl(cells[i]));
    }

    console.log(`[hackTheLink] Played ${cells.length}/${path.length} cells via keyboard (completeMap=${completeMap})`);
  },

  // Resolve as soon as the move lands (destination joined the trail or took
  // focus), or after MAX_WAIT_MS. Tries a synchronous check first — React often
  // flushes discrete key events before dispatchEvent even returns — then polls
  // per frame.
  waitForMove(targetEl) {
    if (this.moved(targetEl)) return Promise.resolve();
    return new Promise((resolve) => {
      const deadline = performance.now() + this.MAX_WAIT_MS;
      const check = () => {
        if (this.moved(targetEl) || performance.now() >= deadline) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },

  moved(el) {
    return !!el && (!!el.querySelector('[data-testid="filled-cell"]') || document.activeElement === el);
  },

  // A fresh board has exactly one filled cell (the start). More than that means
  // there's an existing trail to clear, which clicking the start node does.
  filledCount() {
    return document.querySelectorAll('[data-testid="filled-cell"]').length;
  },

  async resetIfNeeded(startEl) {
    if (this.filledCount() <= 1) return;

    console.log("[hackTheLink] Existing trail found, resetting via start node");
    this.clickCell(startEl);

    const deadline = performance.now() + 300;
    while (this.filledCount() > 1 && performance.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    if (this.filledCount() > 1) console.warn("[hackTheLink] Board did not reset cleanly");
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
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const Ctor = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, { ...opts, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    }
  },
};
