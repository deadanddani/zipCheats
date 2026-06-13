// Registry of per-game board renderers, keyed by game id. View scripts
// self-register on load, so either context can paint any game by id without
// referencing the concrete view class. A view implements draw(canvas, map).
const GameViews = {
  _byId: {},

  register(id, view) {
    this._byId[id] = view
  },

  get(id) {
    return this._byId[id] ?? null
  },
}
