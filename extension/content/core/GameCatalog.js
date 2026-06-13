// Metadata-only so both the popup and the content script can load it without
// pulling in the content-script-only runtime (extractor/solver/player).
// To add a game: append an entry here, drop its files under content/games/<id>/
// and register the runtime in GameRegistry.
const GameCatalog = {
  games: [
    {
      id: 'zip',
      name: 'Zip',
      icon: 'content/games/zip/media/zip-icon.svg', // resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/zip/',
      match: '/games/zip',
      selector: '[data-trail-grid]',
      viewScript: 'content/games/zip/ZipBoardView.js',
    },
    {
      id: 'queens',
      name: 'Queens',
      icon: 'content/games/queens/media/queens-icon.png', // resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/queens/',
      match: '/games/queens',
      selector: '#game-board-container, .game-board-container, [id*="queens"], [class*="queens-grid"]',
      viewScript: 'content/games/queens/QueensBoardView.js',
    },
    {
      id: 'sudoku',
      name: 'Sudoku',
      icon: 'content/games/sudoku/media/sudoku-icon.png', // resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/mini-sudoku/',
      match: '/games/mini-sudoku',
      selector: '.sudoku-cell[data-cell-idx], [data-cell-idx]',
      viewScript: 'content/games/sudoku/SudokuBoardView.js',
    },
    {
      id: 'tango',
      name: 'Tango',
      icon: 'content/games/tango/media/tango-icon.png', // resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/tango/',
      match: '/games/tango',
      selector: '#tango-cell-0, [id^="tango-cell-"], [data-cell-idx]',
      viewScript: 'content/games/tango/TangoBoardView.js',
    },
    {
      id: 'patches',
      name: 'Patches',
      icon: 'content/games/patches/media/patches-icon.png', // resolve with chrome.runtime.getURL
      url: 'https://www.linkedin.com/games/patches/',
      match: '/games/patches',
      selector: '[data-testid="cell-0"], [data-cell-idx]',
      viewScript: 'content/games/patches/PatchesBoardView.js',
    },
  ],

  byId(id) {
    return this.games.find((g) => g.id === id) ?? null
  },
}
