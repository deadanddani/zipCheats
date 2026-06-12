// Pure metadata for every game the extension supports. No references to the
// extractor/solver/player (which only exist in the content-script context), so
// this file is safe to load anywhere — both the popup (to render the game list)
// and the content script (to detect the current game) consume it.
//
// To add a game: append an entry here, drop its files under content/games/<id>/
// (extractor, solver, player, view) and register the runtime in GameRegistry.
const GameCatalog = {
  games: [
    {
      id: 'zip',
      name: 'Zip',
      icon: 'content/games/zip/media/zip-icon.svg', // extension-root-relative; resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/zip/',
      match: '/games/zip', // path fragment used to detect the game on a page
      selector: '[data-trail-grid]', // element to wait for before extracting
      viewScript: 'content/games/zip/ZipBoardView.js', // renderer the popup loads on demand
    },
  ],

  byId(id) {
    return this.games.find((g) => g.id === id) ?? null
  },
}
