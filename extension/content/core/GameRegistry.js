// Content-script registry of fully-wired game descriptors (metadata + runtime),
// the counterpart to the metadata-only GameCatalog.
const GameRegistry = {
  games: [Game.assert(ZipGame), Game.assert(QueensGame), Game.assert(SudokuGame), Game.assert(TangoGame), Game.assert(PatchesGame)],

  detect() {
    const path = location.pathname
    return this.games.find((g) => path.includes(g.match)) ?? null
  },
}
