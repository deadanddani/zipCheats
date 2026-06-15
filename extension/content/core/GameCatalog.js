// Metadata-only so both the popup and the content script can load it without
// pulling in the content-script-only runtime (extractor/solver/player).
// To add a game: append an entry here, drop its files under content/games/<id>/
// and register the runtime in GameRegistry.
//
// timerStartsOnClick: how this game's LinkedIn timer behaves on a *fresh* puzzle
// (clock at 0). false → the clock runs from puzzle load; true → it only starts
// on the first move. Either way, if LinkedIn already has time on the clock
// (a resumed puzzle), it keeps counting regardless. Defaults to false.
//
// canAutoSolve: whether the auto-solver may run for this game. When false the
// solve action is blocked. Defaults to true.
//
// stateType / stateScheme: how to find this game's progress in LinkedIn's
// localStorage (used to read elapsed time and detect an already-solved puzzle).
//   stateType   — the numeric game id LinkedIn uses in its keys.
//   stateScheme — 'numeric': separate keys `play:gameState|timeElapsed|shareData:
//                  (<member>,<type>,<N>)`, time in ms. shareData appears on the
//                  first solve but survives a replay, so "solved" also requires
//                  the live board to be complete (see `completion`) when defined.
//                 'urn': one wrapped key `play:urn:li:fsd_game:(<member>,<type>,
//                  <N>)` = { data, expireAt }, time in seconds, solved ⇔ a
//                  terminal gamePlayState (e.g. END_SOLVED).
//
// completion (numeric scheme): { filled: <css for one finished cell>, count:
// 'cells' (rows*cols) | 'rows' }. Used to tell a real solve from a replay.
const GameCatalog = {
  games: [
    {
      id: "zip",
      name: "Zip",
      icon: "content/games/zip/media/zip-icon.svg", // resolve with chrome.runtime.getURL
      url: "https://www.linkedin.com/games/zip/",
      match: "/games/zip",
      selector: "[data-trail-grid]",
      viewScript: "content/games/zip/ZipBoardView.js",
      timerStartsOnClick: false,
      canAutoSolve: true,
      stateType: 6,
      stateScheme: "numeric",
      completion: { filled: '[data-cell-idx] [data-testid="filled-cell"]', count: "cells" },
    },
    {
      id: "queens",
      name: "Queens",
      icon: "content/games/queens/media/queens-icon.png", // resolve with chrome.runtime.getURL
      url: "https://www.linkedin.com/games/queens/",
      match: "/games/queens",
      selector: '#game-board-container, .game-board-container, [id*="queens"], [class*="queens-grid"]',
      viewScript: "content/games/queens/QueensBoardView.js",
      timerStartsOnClick: false,
      canAutoSolve: true,
      stateType: 3,
      stateScheme: "numeric",
      completion: { filled: '[data-cell-idx] [data-testid="queen-svg"]', count: "rows" },
    },
    {
      id: "sudoku",
      name: "Sudoku",
      icon: "content/games/sudoku/media/sudoku-icon.png", // resolve with chrome.runtime.getURL
      url: "https://www.linkedin.com/games/mini-sudoku/",
      match: "/games/mini-sudoku",
      selector: ".sudoku-cell[data-cell-idx], [data-cell-idx]",
      viewScript: "content/games/sudoku/SudokuBoardView.js",
      timerStartsOnClick: false,
      canAutoSolve: true,
      stateType: 7,
      stateScheme: "urn",
    },
    {
      id: "tango",
      name: "Tango",
      icon: "content/games/tango/media/tango-icon.png", // resolve with chrome.runtime.getURL
      url: "https://www.linkedin.com/games/tango/",
      match: "/games/tango",
      selector: '#tango-cell-0, [id^="tango-cell-"], [data-cell-idx]',
      viewScript: "content/games/tango/TangoBoardView.js",
      timerStartsOnClick: true,
      canAutoSolve: true,
      stateType: 5,
      stateScheme: "numeric",
      completion: { filled: '[data-cell-idx] svg[data-testid="cell-zero"], [data-cell-idx] svg[data-testid="cell-one"]', count: "cells" },
    },
    {
      id: "patches",
      name: "Patches",
      icon: "content/games/patches/media/patches-icon.png", // resolve with chrome.runtime.getURL
      url: "https://www.linkedin.com/games/patches/",
      match: "/games/patches",
      selector: '[data-testid="cell-0"], [data-cell-idx]',
      viewScript: "content/games/patches/PatchesBoardView.js",
      timerStartsOnClick: false,
      canAutoSolve: false,
      stateType: 8,
      stateScheme: "numeric",
    },
  ],

  byId(id) {
    return this.games.find((g) => g.id === id) ?? null;
  },
};
