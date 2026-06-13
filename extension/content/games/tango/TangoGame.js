// Catalog metadata wired to Tango's runtime. Content-script context only — it
// references globals (TangoExtractor, …) not loaded in the popup.
const TangoGame = {
  ...GameCatalog.byId('tango'),
  extractor: TangoExtractor,
  solver: TangoSolver,
  player: TangoPlayer,
  view: TangoBoardView,
}
