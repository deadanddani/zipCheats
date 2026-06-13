// Catalog metadata wired to Zip's runtime. Content-script context only — it
// references globals (ZipExtractor, …) not loaded in the popup.
const ZipGame = {
  ...GameCatalog.byId('zip'),
  extractor: ZipExtractor,
  solver: ZipSolver,
  player: ZipPlayer,
  view: ZipBoardView,
}
