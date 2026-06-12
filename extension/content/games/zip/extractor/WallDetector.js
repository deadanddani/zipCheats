const WallDetector = {
  // LinkedIn draws interior walls inside each cell, but both the class names
  // and the grid's CSS variables are hashed and change between builds, so we
  // can't match a specific class. We detect walls two ways, covering both
  // encodings LinkedIn has used:
  //   1. Geometry  - a child element that is a thin strip hugging one edge.
  //   2. Borders   - a full-size child whose own box or ::before/::after
  //                  pseudo-element has a thick border on one side.
  // Anything thicker than this (in px) on one side counts as a wall.
  THICK: 2,

  extract(cellEl) {
    const walls = { top: false, right: false, bottom: false, left: false };
    const cell = cellEl.getBoundingClientRect();
    if (!cell.width || !cell.height) return walls;

    for (const el of cellEl.children) {
      // skip the number, the filled state and the hint arrow
      if (el.matches('[data-cell-content], [data-testid="filled-cell"], [data-cell-hint-arrow]')) continue;

      this.fromGeometry(el, cell, walls);
      this.fromBorders(getComputedStyle(el), walls);
      this.fromBorders(getComputedStyle(el, "::before"), walls);
      this.fromBorders(getComputedStyle(el, "::after"), walls);
    }

    return walls;
  },

  fromGeometry(el, cell, walls) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const thinX = r.width <= cell.width * 0.4;
    const thinY = r.height <= cell.height * 0.4;
    const spansY = r.height >= cell.height * 0.6;
    const spansX = r.width >= cell.width * 0.6;

    if (thinX && spansY) {
      const cx = r.left + r.width / 2;
      if (Math.abs(cx - cell.left) <= Math.abs(cx - cell.right)) walls.left = true;
      else walls.right = true;
    } else if (thinY && spansX) {
      const cy = r.top + r.height / 2;
      if (Math.abs(cy - cell.top) <= Math.abs(cy - cell.bottom)) walls.top = true;
      else walls.bottom = true;
    }
  },

  fromBorders(style, walls) {
    if (parseFloat(style.borderTopWidth) > this.THICK) walls.top = true;
    if (parseFloat(style.borderRightWidth) > this.THICK) walls.right = true;
    if (parseFloat(style.borderBottomWidth) > this.THICK) walls.bottom = true;
    if (parseFloat(style.borderLeftWidth) > this.THICK) walls.left = true;
  },
};
