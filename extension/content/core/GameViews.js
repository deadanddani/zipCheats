// Registry of per-game board renderers, keyed by game id. Each game's view
// script self-registers here on load (e.g. ZipBoardView calls
// `GameViews.register('zip', ZipBoardView)`). Both the content script and the
// popup load this plus the view scripts, so either context can paint any game's
// board with `GameViews.get(id).draw(canvas, map)` without knowing the concrete
// view class. A view only needs to implement `draw(canvas, map)`.
const GameViews = {
  _byId: {},

  register(id, view) {
    this._byId[id] = view
  },

  get(id) {
    return this._byId[id] ?? null
  },
}
