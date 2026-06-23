// Reads LinkedIn's on-screen game timer (the time the puzzle actually records).
// The clock is a leaf "m:ss" node with hashed classes and no testid, so we lock
// onto it by text shape. localStorage's timeElapsed isn't live, so this is the
// only real-time source.
const LiveClock = {
  _el: null,
  RE: /^\s*(\d{1,2}):([0-5]\d)\s*$/,

  _find() {
    const el = this._el;
    if (el && el.isConnected && this.RE.test(el.textContent || "")) return el;
    this._el = null;
    for (const node of document.querySelectorAll("span, div, p")) {
      if (node.children.length !== 0) continue;
      if (!this.RE.test(node.textContent || "")) continue;
      if (node.offsetParent === null) continue;
      this._el = node;
      break;
    }
    return this._el;
  },

  // Seconds on the clock, or null if unreadable.
  seconds() {
    const el = this._find();
    const m = el && (el.textContent || "").match(this.RE);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  },

  // Blocks until the live on-screen timer reaches targetSeconds.
  async waitUntilElapsed(targetSeconds) {
    const target = Math.max(0, targetSeconds || 0);
    while (true) {
      const s = this.seconds();
      if (s != null && s >= target) return;
      await new Promise((r) => setTimeout(r, 80));
    }
  },
};
