// Content-script registry of fully-wired game descriptors (metadata + runtime).
// `detect()` returns the descriptor whose `match` is in the current path, or
// null. To add a game: import its descriptor here and append it to `games`.
const GameRegistry = {
  games: [Game.assert(ZipGame)],

  detect() {
    const path = location.pathname
    return this.games.find((g) => path.includes(g.match)) ?? null
  },
}
