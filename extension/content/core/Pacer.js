// Places an ordered move list, holding the final move (when completeMap) until
// LinkedIn's clock hits solveSeconds. `place(move, i)` returns false on failure.
const Pacer = {
  async play(moves, opts, place) {
    const { completeMap = true, solveSeconds = 0, elapsedAnchor = null } = opts ?? {};
    const list = completeMap ? moves : moves.slice(0, -1);
    let placed = 0;
    for (let i = 0; i < list.length; i++) {
      if (completeMap && i === list.length - 1) {
        await LiveClock.waitUntilElapsed(solveSeconds);
      }
      if ((await place(list[i], i)) !== false) placed++;
    }
    return { placed, total: list.length };
  },
};
