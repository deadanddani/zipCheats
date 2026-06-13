// Backtracking solver for Tango. Fills empty cells in row-major order, trying
// Sun then Moon, and prunes any placement that would break a rule:
//   • three of the same symbol in a row (horizontal or vertical);
//   • more than size/2 of a symbol in any row or column;
//   • a "=" / "×" link with an already-filled neighbour.
// The board is small (6×6), so plain DFS with these checks is instant.
class TangoSolverCore {
  constructor(map) {
    this.map = map;
    this.n = map.size;
    this.half = map.size / 2;
    // Mutable working grid (numbers), seeded with the givens.
    this.grid = map.toGrid();
  }

  // Returns the solved 2D grid, or null if unsolvable.
  solve(timeBudgetMs = 10000) {
    const start = performance.now();
    const order = [];
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        if (this.grid[r][c] === 0) order.push([r, c]);
      }
    }

    this._steps = 0;
    this._deadline = start + timeBudgetMs;
    const ok = this.fill(order, 0);
    console.log(`[hackTheLink] Tango solver finished in ${(performance.now() - start).toFixed(2)} ms, ${this._steps} steps, solved=${ok}`);
    return ok ? this.grid : null;
  }

  fill(order, i) {
    if (i === order.length) return true;
    if (performance.now() > this._deadline) {
      console.warn('[hackTheLink] Tango solver timed out');
      return false;
    }
    const [r, c] = order[i];
    for (const value of [TANGO_SUN, TANGO_MOON]) {
      this._steps++;
      if (!this.canPlace(r, c, value)) continue;
      this.grid[r][c] = value;
      if (this.fill(order, i + 1)) return true;
      this.grid[r][c] = 0;
    }
    return false;
  }

  canPlace(r, c, value) {
    const g = this.grid;
    g[r][c] = value; // place tentatively so run/count checks see it
    const ok = this.noTriple(r, c) && this.countOk(r, c, value) && this.linksOk(r, c, value);
    g[r][c] = 0;
    return ok;
  }

  // No run of 3 identical symbols through (r,c), horizontally or vertically.
  noTriple(r, c) {
    const g = this.grid;
    const v = g[r][c];
    const run = (dr, dc) => {
      let count = 1;
      for (let k = 1; ; k++) { const rr = r + dr * k, cc = c + dc * k; if (g[rr]?.[cc] === v) count++; else break; }
      for (let k = 1; ; k++) { const rr = r - dr * k, cc = c - dc * k; if (g[rr]?.[cc] === v) count++; else break; }
      return count;
    };
    return run(0, 1) < 3 && run(1, 0) < 3;
  }

  // At most size/2 of `value` in this row and this column.
  countOk(r, c, value) {
    let row = 0, col = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.grid[r][i] === value) row++;
      if (this.grid[i][c] === value) col++;
    }
    return row <= this.half && col <= this.half;
  }

  // Every link to an already-filled orthogonal neighbour is satisfied.
  linksOk(r, c, value) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      const nv = this.grid[nr]?.[nc];
      if (!nv) continue; // neighbour empty or off-board
      const link = this.map.linkBetween(r, c, nr, nc);
      if (link === '=' && nv !== value) return false;
      if (link === 'x' && nv === value) return false;
    }
    return true;
  }
}
