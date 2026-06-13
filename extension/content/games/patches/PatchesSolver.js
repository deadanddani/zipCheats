// Patches ships its full solution (the region partition) in the payload, so the
// "solver" just returns that. We return the regionGrid (2D array of region ids,
// -1 = unassigned) so PatchesBoardView can paint it and PatchesPlayer can replay
// it. There is no fallback solver: without LinkedIn's solution we have no puzzle.
const PatchesSolver = {
  solve(map) {
    const regionGrid = map?.solution ?? map?.regionGrid
    if (!Array.isArray(regionGrid) || !regionGrid.length) {
      console.warn('[hackTheLink] PatchesSolver: no solution in map')
      return null
    }
    console.log('[hackTheLink] PatchesSolver: using LinkedIn solution ✔', regionGrid)
    return regionGrid
  },
}
