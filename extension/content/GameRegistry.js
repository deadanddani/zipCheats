const GameRegistry = {
  games: [
    { match: '/games/zip', extractor: ZipExtractor },
  ],

  detect() {
    const path = location.pathname
    return this.games.find((g) => path.includes(g.match)) ?? null
  },
}
